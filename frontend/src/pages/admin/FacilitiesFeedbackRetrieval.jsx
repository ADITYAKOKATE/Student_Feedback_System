import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './FeedbackRetrieval.css';
import { feedbackQuestions } from '../../utils/feedbackQuestions';
import collegeHeader from "../../assets/college_header.png"; // Import header image

const FacilitiesFeedbackRetrieval = () => {
    const { user } = useAuth();
    // We now store both types
    const [libraryFeedbacks, setLibraryFeedbacks] = useState([]);
    const [facilitiesFeedbacks, setFacilitiesFeedbacks] = useState([]);

    const [loading, setLoading] = useState(false);

    const [filters, setFilters] = useState({
        department: user?.department !== 'All' ? user.department : 'Computer - AIML',
        class: 'SE',
        division: 'All',
        fromDate: '',
        toDate: '',
        feedbackCategory: 'All', // New filter
        feedbackRound: '1', // Default to Round 1
    });

    // For detail modal
    const [selectedFacility, setSelectedFacility] = useState(null);
    const [detailFeedbacks, setDetailFeedbacks] = useState([]); // List of individual feedbacks
    const [detailLoading, setDetailLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const departments = ['Computer - AIML', 'Computer', 'IT', 'EXTC', 'Civil', 'Mechanical'];
    const classes = ['SE', 'TE', 'BE'];
    const divisions = ['All', 'A', 'B', 'C'];

    useEffect(() => {
        fetchFeedbackSummary();
    }, [filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const fetchFeedbackSummary = async () => {
        setLoading(true);
        try {
            // Fetch Library
            const libParams = { ...filters, feedbackType: 'library' };
            const facParams = { ...filters, feedbackType: 'other_facilities' };

            const promises = [];

            // Conditional Fetching
            if (filters.feedbackCategory === 'All' || filters.feedbackCategory === 'Library') {
                promises.push(api.get('/feedback/summary', { params: libParams }));
            } else {
                promises.push(Promise.resolve({ data: { success: true, data: [] } })); // Empty resolved promise
            }

            if (filters.feedbackCategory === 'All' || filters.feedbackCategory === 'Other Facilities') {
                promises.push(api.get('/feedback/summary', { params: facParams }));
            } else {
                promises.push(Promise.resolve({ data: { success: true, data: [] } }));
            }

            const [libRes, facRes] = await Promise.all(promises);

            if (libRes.data.success) {
                const sortedLib = libRes.data.data.sort((a, b) => (a.division || '').localeCompare(b.division || ''));
                setLibraryFeedbacks(sortedLib);
            }
            if (facRes.data.success) {
                const sortedFac = facRes.data.data.sort((a, b) => (a.division || '').localeCompare(b.division || ''));
                setFacilitiesFeedbacks(sortedFac);
            }

        } catch (error) {
            console.error("Error fetching summary:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (facility) => {
        // Need to know if it's library or facilities to pick correct questions/type
        // facility object has facultyName which we set to 'Library' or 'Other Facilities' in backend
        // But better to check facultyId or just infer from name or pass type explicitly

        // Let's pass type from button
        setSelectedFacility(facility);
        setShowModal(true);
        setDetailLoading(true);

        // Infer type: checks if name is 'Library'
        const type = facility.facultyName === 'Library' ? 'library' : 'other_facilities';

        try {
            const params = {
                ...filters,
                feedbackType: type
            };
            const response = await api.get('/feedback/reports', { params });
            if (response.data.success) {
                setDetailFeedbacks(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching details:", error);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedFacility(null);
        setDetailFeedbacks([]);
    };

    const getAverageColor = (rating) => {
        const num = parseFloat(rating);
        if (num >= 4) return 'text-success';
        if (num >= 3) return 'text-warning';
        return 'text-danger';
    };

    const handlePrint = () => {
        window.print();
    };

    // Helper to render question table for report/modal
    const renderQuestionTable = (item, type) => {
        const questions = type === 'library' ? feedbackQuestions.library : feedbackQuestions.facilities;
        return (
            <table className="report-table">
                <thead>
                    <tr>
                        <th style={{ width: '50px' }}>Q. No</th>
                        <th>Question</th>
                        <th style={{ width: '100px' }}>Avg Rating</th>
                    </tr>
                </thead>
                <tbody>
                    {questions.map((question, qIdx) => {
                        const isRating = type === 'library' ? qIdx < 4 : qIdx < 12;
                        if (!isRating) return null;
                        const key = `q${qIdx + 1}`;
                        const rating = item.questionAverageRatings ? item.questionAverageRatings[key] : 'N/A';
                        return (
                            <tr key={key}>
                                <td style={{ width: '50px' }}>Q{qIdx + 1}</td>
                                <td style={{ fontSize: '1.1rem' }}>{question}</td>
                                <td style={{ width: '100px', fontWeight: 'bold' }}>{rating}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        )
    };

    // Helper to aggregate feedbacks by facultyName (Facility Name)
    const aggregateFeedbacks = (feedbacks) => {
        const aggregated = {};

        feedbacks.forEach(item => {
            if (!aggregated[item.facultyName]) {
                // Initialize with a copy, converting ratings to numbers for math
                aggregated[item.facultyName] = {
                    ...item,
                    questionAverageRatings: { ...item.questionAverageRatings }
                };
            } else {
                const existing = aggregated[item.facultyName];
                const totalA = parseInt(existing.totalFeedbacks || 0);
                const totalB = parseInt(item.totalFeedbacks || 0);
                const newTotal = totalA + totalB;

                if (newTotal > 0) {
                    // Update overall average rating (Weighted Average)
                    const avgA = parseFloat(existing.averageRating || 0);
                    const avgB = parseFloat(item.averageRating || 0);
                    existing.averageRating = ((avgA * totalA) + (avgB * totalB)) / newTotal;

                    // Update question-wise averages
                    Object.keys(existing.questionAverageRatings || {}).forEach(qKey => {
                        const qAvgA = parseFloat(existing.questionAverageRatings[qKey] || 0);
                        const qAvgB = parseFloat(item.questionAverageRatings ? item.questionAverageRatings[qKey] || 0 : 0);
                        existing.questionAverageRatings[qKey] = ((qAvgA * totalA) + (qAvgB * totalB)) / newTotal;
                    });
                }
                existing.totalFeedbacks = newTotal;
            }
        });

        // Convert back to array and format decimals
        return Object.values(aggregated).map(item => {
            item.averageRating = (parseFloat(item.averageRating) || 0).toFixed(2);
            Object.keys(item.questionAverageRatings || {}).forEach(qKey => {
                item.questionAverageRatings[qKey] = (parseFloat(item.questionAverageRatings[qKey]) || 0).toFixed(2);
            });
            // Ensure the aggregated item reflects the selected division filter
            // If we are aggregating, we are essentially creating a report for the selected scope
            item.division = filters.division;
            return item;
        });
    };

    // Filter and Aggregate
    let combinedFeedbacks = [];
    const cleanLibrary = libraryFeedbacks.filter(i => i.facultyName === 'Library');
    const cleanFacilities = facilitiesFeedbacks.filter(i => i.facultyName !== 'Library'); // Prevent overlap

    let rawCombined = [];
    if (filters.feedbackCategory === 'All') {
        rawCombined = [...cleanLibrary, ...cleanFacilities];
    } else if (filters.feedbackCategory === 'Library') {
        rawCombined = [...cleanLibrary];
    } else if (filters.feedbackCategory === 'Other Facilities') {
        rawCombined = [...cleanFacilities];
    }

    // Only aggregate if we are viewing 'All' divisions, otherwise keep separate
    // Actually for Facilities, we usually want one report regardless of division breakdown
    combinedFeedbacks = aggregateFeedbacks(rawCombined);

    return (
        <div className="feedback-retrieval">
            <div className="header-actions">
                <h2 className="page-title">
                    {filters.feedbackCategory === 'All' ? 'Facilities & Library' : filters.feedbackCategory} Feedback Report
                </h2>
            </div>

            <div className="card">
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Department</label>
                        <select
                            name="department"
                            className="form-select"
                            value={filters.department}
                            onChange={handleFilterChange}
                            disabled={user?.department !== 'All'}
                        >
                            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Class</label>
                        <select name="class" className="form-select" value={filters.class} onChange={handleFilterChange}>
                            {classes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Division</label>
                        <select name="division" className="form-select" value={filters.division} onChange={handleFilterChange}>
                            {divisions.map(div => <option key={div} value={div}>{div}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Feedback Type</label>
                        <select name="feedbackCategory" className="form-select" value={filters.feedbackCategory} onChange={handleFilterChange}>
                            <option value="All">All</option>
                            <option value="Library">Library</option>
                            <option value="Other Facilities">Other Facilities</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Feedback Round</label>
                        <select
                            name="feedbackRound"
                            className="form-select"
                            value={filters.feedbackRound}
                            onChange={handleFilterChange}
                        >
                            <option value="1">Round 1</option>
                            <option value="2">Round 2</option>
                            <option value="All">All Rounds</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">From</label>
                        <input
                            type="date"
                            name="fromDate"
                            className="form-input"
                            value={filters.fromDate}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">To</label>
                        <input
                            type="date"
                            name="toDate"
                            className="form-input"
                            value={filters.toDate}
                            onChange={handleFilterChange}
                        />
                    </div>
                </div>

                <div className="form-actions_">
                    <button className="btn btn-success" onClick={handlePrint} disabled={combinedFeedbacks.length === 0}>
                        Print / Save PDF
                    </button>
                </div>
            </div>

            {
                loading ? (
                    <div className="spinner-container"><div className="spinner"></div></div>
                ) : (
                    <div className="feedback-results">
                        {/* Library Section */}
                        {libraryFeedbacks.length > 0 && (
                            <div className="section-block" style={{ marginBottom: '2rem' }}>
                                <h3 className="section-title">Library Feedback</h3>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Facility Type</th>
                                                {filters.division === 'All' && <th>Division</th>}
                                                <th>Total Feedbacks</th>
                                                <th>Average Rating</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {libraryFeedbacks.map((item) => (
                                                <tr key={item.facultyId}>
                                                    <td>{item.facultyName}</td>
                                                    {filters.division === 'All' && <td>{item.division}</td>}
                                                    <td>{item.totalFeedbacks}</td>
                                                    <td className={getAverageColor(item.averageRating)} style={{ fontWeight: 'bold' }}>
                                                        {item.averageRating} / 5
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-sm btn-primary" onClick={() => handleViewDetails(item)}>
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Facilities Section */}
                        {facilitiesFeedbacks.length > 0 && (
                            <div className="section-block">
                                <h3 className="section-title">Other Facilities Feedback</h3>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Facility Type</th>
                                                {filters.division === 'All' && <th>Division</th>}
                                                <th>Total Feedbacks</th>
                                                <th>Average Rating</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {facilitiesFeedbacks.map((item) => (
                                                <tr key={item.facultyId}>
                                                    <td>{item.facultyName}</td>
                                                    {filters.division === 'All' && <td>{item.division}</td>}
                                                    <td>{item.totalFeedbacks}</td>
                                                    <td className={getAverageColor(item.averageRating)} style={{ fontWeight: 'bold' }}>
                                                        {item.averageRating} / 5
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-sm btn-primary" onClick={() => handleViewDetails(item)}>
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {combinedFeedbacks.length === 0 && (
                            <div className="alert alert-info">No feedback data found for the selected criteria.</div>
                        )}
                    </div>
                )
            }

            {/* Print Friendly Report - Combined */}
            {
                combinedFeedbacks.length > 0 && (
                    <div className="print-report">
                        {combinedFeedbacks.map((item, index) => (
                            <div key={item.facultyId || index} className="detailed-report-page" style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '20px',
                                pageBreakAfter: 'always',
                            }}>

                                {/* Header for Each Page */}
                                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                    <img src={collegeHeader} alt="College Header" style={{ width: '100%', maxWidth: '450px', height: 'auto', display: 'block', margin: '0 auto' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '20px' }}>
                                    <div><strong>Department :</strong> CSE AIML</div>
                                    <div><strong>Division :</strong> {item.division || filters.division}</div>
                                </div>

                                {/* Content */}
                                <div className="report-card" style={{ border: 'none', boxShadow: 'none', flex: '1 1 auto' }}>
                                    <h3 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '1.2rem' }}>
                                        {item.facultyName} Feedback Report {filters.feedbackRound !== 'All' ? `(Round ${filters.feedbackRound})` : ''}
                                    </h3>

                                    <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1rem' }}>
                                        Total Feedbacks: <strong>{item.totalFeedbacks}</strong> | Overall Rating: <strong>{item.averageRating} / 5</strong>
                                    </div>

                                    {renderQuestionTable(item, (item.facultyName === 'Library' || filters.feedbackCategory === 'Library') ? 'library' : 'other_facilities')}
                                </div>

                                {/* Footer for Each Page */}
                                <div style={{
                                    marginTop: '50px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '0 10px'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p>Academic Coordinator</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p>H.O.D.</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Modal for Details */}
            {
                showModal && selectedFacility && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Details: {selectedFacility.facultyName}</h3>
                                <button className="close-btn" onClick={closeModal}>&times;</button>
                            </div>
                            <div className="modal-body">
                                {detailLoading ? <div className="spinner"></div> : (
                                    <>
                                        <h4>Question-wise Averages</h4>
                                        <div className="table-container">
                                            {renderQuestionTable(selectedFacility, selectedFacility.facultyName === 'Library' ? 'library' : 'other_facilities')}
                                        </div>

                                        <h4>Student Comments / Suggestions</h4>
                                        <div className="comments-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {detailFeedbacks.filter(f => f.comments).length === 0 ? (
                                                <p className="text-muted">No comments provided.</p>
                                            ) : (
                                                <ul>
                                                    {detailFeedbacks.filter(f => f.comments).map((feedback, idx) => (
                                                        <li key={idx} style={{ marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
                                                            "{feedback.comments}"
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default FacilitiesFeedbackRetrieval;
