import { useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './FeedbackRetrieval.css'; // Reusing existing CSS
import collegeHeader from "../../assets/college_header.png";

const DepartmentPracticalFeedbackRetrieval = () => {
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
                feedbackType: 'practical', // Specialized for Practical
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

    // Helper to group feedbacks by Class, then by Faculty (for RowSpan)
    const groupedFeedbacks = feedbacks.reduce((acc, item) => {
        const className = item.class || 'Unknown';
        if (!acc[className]) {
            acc[className] = {
                items: [],
                groupedByFaculty: {}
            };
        }

        // Group by Faculty Name + Subject Name to ensure unique distinct faculty/subject courses are grouped
        const facultyKey = `${item.facultyName}_${item.subjectName}`;
        if (!acc[className].groupedByFaculty[facultyKey]) {
            acc[className].groupedByFaculty[facultyKey] = [];
        }
        acc[className].groupedByFaculty[facultyKey].push(item);

        // Ensure batches are sorted
        acc[className].groupedByFaculty[facultyKey].sort((a, b) => {
            // Simple alpha sort for batches, can be improved if needed
            if (!a.batch) return -1;
            if (!b.batch) return 1;
            return a.batch.localeCompare(b.batch);
        });

        return acc;
    }, {});


    return (
        <div className="feedback-retrieval">
            <h2 className="page-title no-print">Department Level Practical Feedback</h2>

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
                            {filters.feedbackRound === '1' ? '1st' : (filters.feedbackRound === '2' ? '2nd' : '')} Practical Feedback ({['1', '2'].includes(filters.feedbackRound) ? (filters.feedbackRound === '1' ? 'Odd Sem' : 'Even Sem') : 'All Rounds'})
                        </h4>
                    </div>

                    {classOrder.map(className => {
                        const classGroup = groupedFeedbacks[className];
                        if (!classGroup || Object.keys(classGroup.groupedByFaculty).length === 0) return null;

                        // Flatten groupedByFaculty to array for rendering with indices
                        const facultyGroups = Object.values(classGroup.groupedByFaculty);

                        // Calculate total items (rows) for this class for the Class rowSpan
                        const totalRows = facultyGroups.reduce((acc, group) => acc + group.length, 0);

                        let currentRowIndex = 0;

                        return (
                            <div key={className} style={{ marginBottom: '30px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                                <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ border: '2px solid #000', padding: '8px', width: '50px', textAlign: 'center' }}>Sr No</th>
                                            <th style={{ border: '2px solid #000', padding: '8px', width: '60px', textAlign: 'center' }}>Class</th>
                                            <th style={{ border: '2px solid #000', padding: '8px' }}>Name of faculty</th>
                                            <th style={{ border: '2px solid #000', padding: '8px', width: '100px' }}>Lab</th>
                                            <th style={{ border: '2px solid #000', padding: '8px', width: '80px', textAlign: 'center' }}>Batch</th>
                                            <th style={{ border: '2px solid #000', padding: '8px', width: '80px', textAlign: 'center' }}>No of Students</th>
                                            <th style={{ border: '2px solid #000', padding: '8px', width: '80px', textAlign: 'center' }}>Score (Out of 5)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {facultyGroups.map((group, groupIndex) => (
                                            group.map((item, itemIndex) => {
                                                const isFirstRowOfClass = currentRowIndex === 0;
                                                const isFirstRowOfFaculty = itemIndex === 0;
                                                currentRowIndex++;

                                                return (
                                                    <tr key={`${item.facultyId}_${item.batch}_${itemIndex}`}>
                                                        {isFirstRowOfFaculty && (
                                                            <td rowSpan={group.length} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                                {groupIndex + 1}
                                                            </td>
                                                        )}

                                                        {isFirstRowOfClass && (
                                                            <td rowSpan={totalRows} style={{ border: '2px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
                                                                {className}
                                                            </td>
                                                        )}

                                                        {isFirstRowOfFaculty && (
                                                            <>
                                                                <td rowSpan={group.length} style={{ border: '1px solid #000', padding: '8px', verticalAlign: 'middle' }}>{item.facultyName}</td>
                                                                <td rowSpan={group.length} style={{ border: '1px solid #000', padding: '8px', verticalAlign: 'middle' }}>{item.subjectName}</td>
                                                            </>
                                                        )}

                                                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.batch}</td>
                                                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.totalFeedbacks}</td>
                                                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{item.averageRating}</td>
                                                    </tr>
                                                );
                                            })
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

export default DepartmentPracticalFeedbackRetrieval;
