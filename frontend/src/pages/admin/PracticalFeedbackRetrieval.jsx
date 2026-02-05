import { useState } from 'react';
import api from '../../utils/api';
import './FeedbackRetrieval.css';
import { feedbackQuestions } from '../../utils/feedbackQuestions';

const PracticalFeedbackRetrieval = () => {
    const [filters, setFilters] = useState({
        department: 'Computer - AIML',
        class: 'SE',
        division: 'SE A',
        fromDate: '',
        toDate: '',
    });

    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters({
            ...filters,
            [name]: value,
        });
    };

    const [selectedFeedback, setSelectedFeedback] = useState(null); // For modal

    const fetchDetailedReports = async (facultyId) => {
        try {
            setLoading(true);
            const response = await api.get(`/feedback/faculty/${facultyId}`, {
                params: { feedbackType: 'practical' }
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
                division: filters.division.split(' ')[1],
                feedbackType: 'practical',
            };

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

    return (
        <div className="feedback-retrieval">
            <h2 className="page-title">Practical Feedback Retrieval</h2>

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
                                <option value="SE A">SE A</option>
                                <option value="SE B">SE B</option>
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
                            <button
                                type="button"
                                className="btn btn-success"
                                onClick={handlePrint}
                            >
                                Print
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {feedbacks.length > 0 && (
                <div className="feedback-results">
                    <h3>Feedback Summary ({feedbacks.length} Teachers)</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Faculty Name</th>
                                    <th>Subject</th>
                                    <th>Total Feedbacks</th>
                                    <th>Average Rating</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {feedbacks.map((item) => (
                                    <tr key={item.facultyId}>
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
                                        <td>
                                            <button
                                                className="btn btn-sm btn-outline-info"
                                                onClick={() => fetchDetailedReports(item.facultyId)}
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
                            <div className="ratings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {Object.entries(selectedFeedback.averageRatings || {}).map(([key, value]) => (
                                    <div key={key} className="rating-item" style={{ background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}>
                                        <div style={{ textTransform: 'capitalize', fontSize: '0.9rem', color: '#555' }}>{key.replace(/_/g, ' ')}</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: Number(value) >= 4 ? '#28a745' : '#dc3545' }}>{value} / 5</div>
                                    </div>
                                ))}
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
                    <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Feedback Summary Report - Practical</h2>
                    <p style={{ textAlign: 'center' }}>
                        <strong>Department:</strong> {filters.department} |
                        <strong> Class:</strong> {filters.class} |
                        <strong> Division:</strong> {filters.division}
                    </p>
                    <hr />

                    {feedbacks.map((item, index) => (
                        <div key={index} className="report-card">
                            <div className="report-header">
                                <div>
                                    <h3>{item.facultyName}</h3>
                                    <p>Subject: {item.subjectName}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h4>Overall Rating: {item.averageRating} / 5</h4>
                                    <p>Total Feedbacks: {item.totalFeedbacks}</p>
                                </div>
                            </div>

                            <h4>Question-wise Analysis</h4>
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Q. No</th>
                                        <th>Question</th>
                                        <th>Average Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {feedbackQuestions.practical.map((question, qIdx) => {
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PracticalFeedbackRetrieval;
