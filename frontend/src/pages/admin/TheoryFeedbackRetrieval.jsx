import { useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './FeedbackRetrieval.css';
import { feedbackQuestions } from '../../utils/feedbackQuestions';
import collegeHeader from '../../assets/college_header.jpg'; // Import header image

const TheoryFeedbackRetrieval = () => {
    const { user } = useAuth();
    const [filters, setFilters] = useState({
        department: user?.department !== 'All' ? user.department : 'Computer - AIML',
        class: 'SE',
        division: 'All', // Changed default to 'All'
        fromDate: '',
        toDate: '',
    });

    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [selectedFeedback, setSelectedFeedback] = useState(null); // For modal

    const divisions = ['All', 'A', 'B', 'C'];
    const classes = ['SE', 'TE', 'BE'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters({
            ...filters,
            [name]: value,
        });
    };

    const fetchDetailedReports = async (facultyId) => {
        try {
            setLoading(true);
            const response = await api.get(`/feedback/faculty/${facultyId}`, {
                params: { feedbackType: 'theory' }
            });
            if (response.data.success) {
                setSelectedFeedback({
                    type: 'faculty_summary',
                    data: response.data.data, // List of individual feedbacks
                    facultyName: response.data.data[0]?.faculty?.facultyName || 'Unknown',
                    averageRatings: response.data.averageRatings
                });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to fetch detailed reports' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        setFeedbacks([]); // Clear previous results

        try {
            const params = {
                department: filters.department,
                class: filters.class,
                feedbackType: 'theory',
            };

            if (filters.division !== 'All') {
                params.division = filters.division;
            }

            if (filters.fromDate) params.fromDate = filters.fromDate;
            if (filters.toDate) params.toDate = filters.toDate;

            const response = await api.get('/feedback/summary', { params });

            if (response.data.success) {
                setFeedbacks(response.data.data);
                if (response.data.data.length === 0) {
                    setMessage({ type: 'info', text: 'No feedback found for the selected criteria' });
                }
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || 'Error fetching feedback',
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = async () => {
        try {
            const params = {
                department: filters.department,
                class: filters.class,
                feedbackType: 'theory',
            };
            if (filters.division !== 'All') params.division = filters.division;
            if (filters.fromDate) params.fromDate = filters.fromDate;
            if (filters.toDate) params.toDate = filters.toDate;

            const response = await api.get('/feedback/export', { params });
            if (response.data.success) {
                // Convert JSON to CSV
                const data = response.data.data;
                if (data.length === 0) {
                    setMessage({ type: 'info', text: 'No data to export' });
                    return;
                }

                const headers = ['GR No', 'Username', 'Faculty', 'Subject', 'Div', 'Ratings', 'Comments', 'Date'];
                const csvContent = [
                    headers.join(','),
                    ...data.map(row => [
                        row.studentGrNo,
                        row.studentUsername,
                        `"${row.facultyName}"`,
                        `"${row.subject}"`,
                        row.division,
                        `"${JSON.stringify(row.ratings).replace(/"/g, '""')}"`, // Escape quotes
                        `"${(row.comments || '').replace(/"/g, '""')}"`,
                        new Date(row.submittedAt).toLocaleDateString()
                    ].join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `theory_feedback_${filters.class}_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error exporting data' });
        }
    };

    return (
        <div className="feedback-retrieval">
            <h2 className="page-title">Theory Feedback Retrieval</h2>

            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="department" className="form-label">
                                Department
                            </label>
                            <input
                                type="text"
                                id="department"
                                name="department"
                                className="form-input"
                                value={filters.department}
                                onChange={handleChange}
                                required
                                disabled={user?.department !== 'All'}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="class" className="form-label">
                                Year
                            </label>
                            <select
                                id="class"
                                name="class"
                                className="form-select"
                                value={filters.class}
                                onChange={handleChange}
                                required
                            >
                                <option value="SE">SE</option>
                                <option value="TE">TE</option>
                                <option value="BE">BE</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="division" className="form-label">
                                Division
                            </label>
                            <select
                                id="division"
                                name="division"
                                className="form-select"
                                value={filters.division}
                                onChange={handleChange}
                                required
                            >
                                {divisions.map((div) => (
                                    <option key={div} value={div}>
                                        {div === 'All' ? 'All' : div}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="fromDate" className="form-label">
                                From
                            </label>
                            <input
                                type="date"
                                id="fromDate"
                                name="fromDate"
                                className="form-input"
                                value={filters.fromDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="toDate" className="form-label">
                                To
                            </label>
                            <input
                                type="date"
                                id="toDate"
                                name="toDate"
                                className="form-input"
                                value={filters.toDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Loading...' : 'Submit'}
                        </button>
                        {feedbacks.length > 0 && (
                            <>
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={handlePrint}
                                >
                                    Print
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-info"
                                    onClick={handleExport}
                                    style={{ color: '#fff' }}
                                >
                                    Export CSV
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>

            {feedbacks.length > 0 && (
                <div className="feedback-results">
                    {/* Helper to render a table for a specific list of items */}
                    {(() => {
                        // Group feedbacks by division
                        const groupedFeedbacks = feedbacks.reduce((acc, item) => {
                            const div = item.division || 'Unknown';
                            if (!acc[div]) acc[div] = [];
                            acc[div].push(item);
                            return acc;
                        }, {});

                        // Sort divisions (e.g., A, B, C...)
                        const sortedDivisions = Object.keys(groupedFeedbacks).sort();

                        return sortedDivisions.map((div) => (
                            <div key={div} className="division-section" style={{ marginBottom: '40px' }}>
                                <h3 className="division-header" style={{
                                    textAlign: 'center',
                                    background: '#f0f0f0',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderBottom: 'none'
                                }}>
                                    Division {div}
                                </h3>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Faculty Name</th>
                                                <th>Subject</th>
                                                <th>Total Feedbacks</th>
                                                <th>Average Rating</th>
                                                <th className="no-print">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groupedFeedbacks[div].map((item) => (
                                                <tr key={item.facultyId + '_' + item.division}>
                                                    <td>{item.facultyName}</td>
                                                    <td>{item.subjectName}</td>
                                                    <td>
                                                        <span className="badge badge-info">{item.totalFeedbacks}</span>
                                                    </td>
                                                    <td>
                                                        <span className={`rating-badge ${item.averageRating >= 4 ? 'good' : item.averageRating >= 3 ? 'average' : 'poor'}`}>
                                                            {item.averageRating} / 5
                                                        </span>
                                                    </td>
                                                    <td className="no-print">
                                                        <button
                                                            className="btn btn-sm btn-outline-info"
                                                            onClick={() => fetchDetailedReports(item.facultyId)} // Note: this might need adjustment if detail view depends on division context, but existing API takes facultyId. 
                                                        // Ideally we should pass division to fetchDetailedReports too if we want to filter details by division, 
                                                        // but the current task is high-level report. 
                                                        // For now, keeping facultyId lookup as is (it might show all divisions for that faculty unless we filter).
                                                        // Let's assume detail view needs to be division-aware too? 
                                                        // The user request is about the "Page kind of way provided in image", which is the summary report.
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ));
                    })()}
                </div>
            )}

            {/* Detail View Modal */}
            {selectedFeedback && selectedFeedback.type === 'faculty_summary' && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div className="modal-content" style={{
                        background: '#fff', padding: '2rem', borderRadius: '8px',
                        maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Feedback Details: {selectedFeedback.facultyName}</h3>
                                <p style={{ color: '#666', margin: '5px 0' }}>Total Submissions: {selectedFeedback.data.length}</p>
                            </div>
                            <button onClick={() => setSelectedFeedback(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>

                        <div className="stats-section" style={{ marginBottom: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                            <h4>Question-wise Average Ratings</h4>
                            <div className="ratings-list">
                                {Object.entries(selectedFeedback.averageRatings || {}).map(([key, value]) => {
                                    const index = parseInt(key.replace('q', '')) - 1;
                                    const questionText = feedbackQuestions.theory[index] || key;
                                    return (
                                        <div key={key} className="rating-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee', alignItems: 'center' }}>
                                            <div style={{ flex: 1, paddingRight: '1rem' }}>
                                                <small style={{ color: '#888', fontWeight: 'bold' }}>Q{index + 1}</small>
                                                <p style={{ margin: '5px 0', fontSize: '0.95rem' }}>{questionText}</p>
                                            </div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: Number(value) >= 4 ? '#28a745' : '#dc3545', minWidth: '60px', textAlign: 'right' }}>
                                                {value} / 5
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <h4>Individual Comments</h4>
                        <div className="comments-list">
                            {selectedFeedback.data.filter(f => f.comments).length === 0 ? (
                                <p>No comments provided.</p>
                            ) : (
                                selectedFeedback.data.filter(f => f.comments).map((feedback, idx) => (
                                    <div key={idx} className="comment-item" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <strong>{feedback.student?.department} Student</strong>
                                            <span style={{ color: '#888', fontSize: '0.85rem' }}>{new Date(feedback.submittedAt).toLocaleDateString()}</span>
                                        </div>
                                        <p style={{ margin: 0, fontStyle: 'italic' }}>"{feedback.comments}"</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                            <button className="btn btn-secondary" onClick={() => setSelectedFeedback(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Print Friendly Report */}
            {feedbacks.length > 0 && (
                <div className="print-report">
                    {filters.division === 'All' ? (
                        /* Summary View for 'All' Divisions */
                        <>
                            <div className="print-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <img src={collegeHeader} alt="College Header" style={{ width: '100%', maxWidth: '450px', height: 'auto', display: 'block', margin: '0 auto 10px auto' }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '5px' }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <div><strong>Department :</strong> {filters.department}</div>
                                        <div style={{ marginTop: '5px' }}><strong>Academic Year :</strong> {new Date().getFullYear()}-{new Date().getFullYear() + 1}</div>
                                        <div style={{ marginTop: '5px' }}><strong>Report :</strong> Theory Feedback</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div>{new Date().toLocaleString()}</div>
                                        <div style={{ marginTop: '25px', fontWeight: 'bold' }}>Theory Feedback</div>
                                    </div>
                                </div>
                            </div>

                            {(() => {
                                const groupedFeedbacks = feedbacks.reduce((acc, item) => {
                                    const div = item.division || 'Unknown';
                                    if (!acc[div]) acc[div] = [];
                                    acc[div].push(item);
                                    return acc;
                                }, {});

                                const sortedDivisions = Object.keys(groupedFeedbacks).sort();

                                return sortedDivisions.map((div) => (
                                    <div key={div} className="print-division-section" style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginBottom: '30px' }}>
                                        <h2 style={{ textAlign: 'center', textTransform: 'uppercase', marginBottom: '10px' }}>
                                            {filters.class} {div}
                                        </h2>
                                        <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '0.8rem', tableLayout: 'fixed' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f2f2f2' }}>
                                                    <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'left', width: '30%' }}>Name</th>
                                                    <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'left', width: '30%' }}>Subject</th>
                                                    <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', width: '20%' }}>Number of Students</th>
                                                    <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', width: '20%' }}>Average</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupedFeedbacks[div].map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ border: '1px solid #000', padding: '5px' }}>{item.facultyName}</td>
                                                        <td style={{ border: '1px solid #000', padding: '5px' }}>{item.subjectName}</td>
                                                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{item.totalFeedbacks}</td>
                                                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{item.averageRating}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ));
                            })()}

                            <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', padding: '0 20px', breakInside: 'avoid' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <p>Academic Coordinator</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p>H.O.D.</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        feedbacks.map((item, index) => (
                            <div key={index} className="detailed-report-page" style={{ pageBreakAfter: 'always', padding: '20px' }}>
                                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                    <img src={collegeHeader} alt="College Header" style={{ width: '100%', maxWidth: '600px', height: 'auto', display: 'block', margin: '0 auto' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '0.9rem', paddingBottom: '10px' }}>
                                    <div><strong>Department :</strong> {filters.department}</div>
                                    <div>{new Date().toLocaleDateString()}</div>
                                </div>

                                <div style={{ textAlign: 'center', margin: '20px 0', fontSize: '1.1rem', fontWeight: 'bold' }}>
                                    The average feedback for {item.subjectName} taught by {item.facultyName} given by {item.totalFeedbacks} students is
                                    <div style={{ fontSize: '1.4rem', marginTop: '10px' }}>{item.averageRating}</div>
                                </div>

                                <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                                    <thead>
                                        <tr style={{ background: '#f0f0f0' }}>
                                            <th style={{ border: '1px solid #000', padding: '8px', width: '50px', textAlign: 'center' }}>Sr</th>
                                            <th style={{ border: '1px solid #000', padding: '8px' }}>Details</th>
                                            <th style={{ border: '1px solid #000', padding: '8px', width: '150px', textAlign: 'center' }}>Average Feedback</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {feedbackQuestions.theory.map((question, qIdx) => {
                                            const key = `q${qIdx + 1}`;
                                            const rating = item.questionAverageRatings ? item.questionAverageRatings[key] : 'N/A';
                                            return (
                                                <tr key={key}>
                                                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{qIdx + 1}</td>
                                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{question}</td>
                                                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{rating}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                <div style={{ marginTop: '100px', display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p>Academic Coordinator</p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p>H.O.D.</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default TheoryFeedbackRetrieval;
