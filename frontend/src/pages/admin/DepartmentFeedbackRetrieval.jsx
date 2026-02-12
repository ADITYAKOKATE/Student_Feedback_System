import { useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './FeedbackRetrieval.css'; // Reusing existing CSS
import collegeHeader from "../../assets/college_header.png";

const DepartmentFeedbackRetrieval = () => {
    const { user } = useAuth();
    const [filters, setFilters] = useState({
        department: user?.department !== 'All' ? user.department : 'Computer - AIML',
        feedbackRound: '1',
    });

    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Classes order for display
    const classOrder = ['BE', 'TE', 'SE'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters({
            ...filters,
            [name]: value,
        });
    };

    const fetchFeedback = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        setFeedbacks([]);

        try {
            const params = {
                department: filters.department,
                feedbackType: 'theory', // Specialized for Theory as per requirement
                feedbackRound: filters.feedbackRound,
                groupBy: 'class' // Critical param for backend aggregation
            };

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

    const handleSubmit = (e) => {
        e.preventDefault();
        fetchFeedback();
    };

    const handlePrint = () => {
        window.print();
    };

    // Helper to group feedbacks by Class
    const groupedFeedbacks = feedbacks.reduce((acc, item) => {
        const className = item.class || 'Unknown';
        if (!acc[className]) acc[className] = [];
        acc[className].push(item);
        return acc;
    }, {});

    return (
        <div className="feedback-retrieval">
            <h2 className="page-title no-print">Department Level Feedback</h2>

            {message.text && (
                <div className={`alert alert-${message.type} no-print`}>{message.text}</div>
            )}

            <div className="card no-print">
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
                            <label htmlFor="feedbackRound" className="form-label">
                                Feedback Round
                            </label>
                            <select
                                id="feedbackRound"
                                name="feedbackRound"
                                className="form-select"
                                value={filters.feedbackRound}
                                onChange={handleChange}
                                required
                            >
                                <option value="1">Round 1</option>
                                <option value="2">Round 2</option>
                                <option value="All">All Rounds</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Loading...' : 'Get Report'}
                        </button>
                        {feedbacks.length > 0 && (
                            <button
                                type="button"
                                className="btn btn-success"
                                onClick={handlePrint}
                            >
                                Print Report
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {feedbacks.length > 0 && (
                <div className="print-report-container">
                    <div className="print-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <img src={collegeHeader} alt="College Header" style={{ width: '100%', maxWidth: '500px', height: 'auto', display: 'block', margin: '0 auto 10px auto' }} />
                        <h3 style={{ margin: '5px 0', textTransform: 'uppercase' }}>
                            Department of {filters.department === 'Computer - AIML' ? 'CSE-AIML' : filters.department}
                        </h3>
                        <h4 style={{ margin: '5px 0' }}>
                            Academic Year {new Date().getFullYear()}-{new Date().getFullYear() + 1}
                        </h4>
                        <h4 style={{ margin: '5px 0', fontWeight: 'bold' }}>
                            {filters.feedbackRound === '1' ? '1st' : (filters.feedbackRound === '2' ? '2nd' : '')} Theory Feedback ({['1', '2'].includes(filters.feedbackRound) ? (filters.feedbackRound === '1' ? 'Even Sem' : 'Odd Sem') : 'All Rounds'})
                        </h4>
                        {/* Note: 'Even Sem' is hardcoded in image for 1st feedback, but sem usually depends on implementation. Keeping generic or matching image strictly? Image says 1st -> Even Sem. */}
                    </div>

                    {classOrder.map(className => {
                        const classData = groupedFeedbacks[className];
                        if (!classData || classData.length === 0) return null;

                        return (
                            <div key={className} style={{ marginBottom: '30px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                                <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ border: '2px solid #000', padding: '8px', width: '50px', textAlign: 'center' }}>Sr No</th>
                                            <th style={{ border: '2px solid #000', padding: '8px', width: '80px', textAlign: 'center' }}>Class</th>
                                            <th style={{ border: '2px solid #000', padding: '8px' }}>Name of faculty</th>
                                            <th style={{ border: '2px solid #000', padding: '8px' }}>Subject</th>
                                            <th style={{ border: '2px solid #000', padding: '8px', width: '100px', textAlign: 'center' }}>No of Students (Total:{classData.reduce((sum, item) => sum + item.totalFeedbacks, 0)})</th>
                                            <th style={{ border: '2px solid #000', padding: '8px', width: '80px', textAlign: 'center' }}>Score (Out of 5)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classData.map((item, index) => (
                                            <tr key={item.facultyId + index}>
                                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{index + 1}</td>
                                                {index === 0 && (
                                                    <td rowSpan={classData.length} style={{ border: '2px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
                                                        {className}
                                                    </td>
                                                )}
                                                <td style={{ border: '1px solid #000', padding: '8px' }}>{item.facultyName}</td>
                                                <td style={{ border: '1px solid #000', padding: '8px' }}>{item.subjectName}</td>
                                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.totalFeedbacks}</td>
                                                <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{item.averageRating}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}

                    <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', padding: '0 20px', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', minWidth: '100px' }}>
                            <p style={{ fontWeight: 'bold', borderTop: '1px solid black', paddingTop: '5px' }}>Academic Coordinator</p>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '100px' }}>
                            <p style={{ fontWeight: 'bold', borderTop: '1px solid black', paddingTop: '5px' }}>H.O.D</p>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '100px' }}>
                            <p style={{ fontWeight: 'bold', borderTop: '1px solid black', paddingTop: '5px' }}>Academic Dean</p>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '100px' }}>
                            <p style={{ fontWeight: 'bold', borderTop: '1px solid black', paddingTop: '5px' }}>Principal</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentFeedbackRetrieval;
