import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './FeedbackRetrieval.css';
import { feedbackQuestions } from '../../utils/feedbackQuestions';

const FacilitiesFeedbackRetrieval = () => {
    const { user } = useAuth();
    // We now store both types
    const [libraryFeedbacks, setLibraryFeedbacks] = useState([]);
    const [facilitiesFeedbacks, setFacilitiesFeedbacks] = useState([]);

    const [loading, setLoading] = useState(false);
    // Removed activeTab state, we default to showing both or just "Combined"

    const [filters, setFilters] = useState({
        department: user?.department !== 'All' ? user.department : 'Computer - AIML',
        class: 'SE',
        division: 'All',
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

            const [libRes, facRes] = await Promise.all([
                api.get('/feedback/summary', { params: libParams }),
                api.get('/feedback/summary', { params: facParams })
            ]);

            if (libRes.data.success) setLibraryFeedbacks(libRes.data.data);
            if (facRes.data.success) setFacilitiesFeedbacks(facRes.data.data);

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
                                <td>{question}</td>
                                <td style={{ width: '100px', fontWeight: 'bold' }}>{rating}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        )
    };

    const combinedFeedbacks = [...libraryFeedbacks, ...facilitiesFeedbacks];

    return (
        <div className="feedback-retrieval">
            <div className="header-actions">
                <h2 className="page-title">Facilities & Library Feedback Report</h2>
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
                    <div className="form-group">
                        <label className="form-label">Division</label>
                        <select name="division" className="form-select" value={filters.division} onChange={handleFilterChange}>
                            {divisions.map(div => <option key={div} value={div}>{div}</option>)}
                        </select>
                    </div>
                </div>

                <div className="form-actions_">
                    <button className="btn btn-success" onClick={handlePrint} disabled={combinedFeedbacks.length === 0}>
                        Print / Save PDF
                    </button>
                </div>
            </div>

            {loading ? (
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
                                            <th>Total Feedbacks</th>
                                            <th>Average Rating</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {libraryFeedbacks.map((item) => (
                                            <tr key={item.facultyId}>
                                                <td>{item.facultyName}</td>
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
                                            <th>Total Feedbacks</th>
                                            <th>Average Rating</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {facilitiesFeedbacks.map((item) => (
                                            <tr key={item.facultyId}>
                                                <td>{item.facultyName}</td>
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
                        <div className="alert alert-info">No feedback data found.</div>
                    )}
                </div>
            )}

            {/* Print Friendly Report - Combined */}
            {combinedFeedbacks.length > 0 && (
                <div className="print-report">
                    <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>
                        Library & Facilities Feedback Report
                    </h2>
                    <div className="report-header">
                        <p><strong>Department:</strong> {filters.department}</p>
                        <p><strong>Class:</strong> {filters.class}</p>
                        <p><strong>Division:</strong> {filters.division}</p>
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                    </div>
                    <hr />

                    {/* Render Library Report Cards */}
                    {libraryFeedbacks.map((item) => (
                        <div key={item.facultyId} className="report-card">
                            <h3>{item.facultyName}</h3>
                            <div className="report-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '10px' }}>
                                <div><strong>Total Feedbacks:</strong> {item.totalFeedbacks}</div>
                                <div><strong>Overall Rating:</strong> {item.averageRating} / 5</div>
                            </div>
                            {renderQuestionTable(item, 'library')}
                        </div>
                    ))}

                    {libraryFeedbacks.length > 0 && facilitiesFeedbacks.length > 0 && <div className="page-break" style={{ height: '30px' }}></div>}

                    {/* Render Facilities Report Cards */}
                    {facilitiesFeedbacks.map((item) => (
                        <div key={item.facultyId} className="report-card">
                            <h3>{item.facultyName}</h3>
                            <div className="report-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '10px' }}>
                                <div><strong>Total Feedbacks:</strong> {item.totalFeedbacks}</div>
                                <div><strong>Overall Rating:</strong> {item.averageRating} / 5</div>
                            </div>
                            {renderQuestionTable(item, 'other_facilities')}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for Details */}
            {showModal && selectedFacility && (
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
            )}
        </div>
    );
};

export default FacilitiesFeedbackRetrieval;
