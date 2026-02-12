import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './FeedbackRetrieval.css'; // Reusing existing CSS
import collegeHeader from "../../assets/college_header.png";

const DepartmentAnalysisReport = () => {
    const { user } = useAuth();
    const [filters, setFilters] = useState({
        department: user?.department !== 'All' ? user.department : 'Computer - AIML',
        feedbackRound: '1',
    });

    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [stats, setStats] = useState({ grandMean: 0, totalZ: 0, sd: 0, totalFaculty: 0 });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters({
            ...filters,
            [name]: value,
        });
    };

    const calculateStats = (data) => {
        // 1. Calculate Row-wise X (Mean of TH and PR)
        let totalEntries = 0; // n = number of boxes with values

        const processedData = data.map(item => {
            const th = parseFloat(item.theoryAverage || 0);
            const pr = parseFloat(item.practicalAverage || 0);

            let total = 0;
            let count = 0;
            if (item.theoryAverage) { total += th; count++; totalEntries++; }
            if (item.practicalAverage) { total += pr; count++; totalEntries++; }

            const totalScore = (item.theoryAverage && item.practicalAverage) ? (th + pr) : (item.theoryAverage ? th : pr);
            const x = count > 0 ? (total / count) : 0;

            return {
                ...item,
                th: item.theoryAverage,
                pr: item.practicalAverage,
                totalScore: totalScore.toFixed(2),
                x: x // Precision kept for calculation
            };
        });

        // 2. Calculate Grand Mean (X bar)
        const validX = processedData.filter(d => d.x > 0);
        const sumX = validX.reduce((acc, item) => acc + item.x, 0);
        const validCount = validX.length;
        const grandMean = validCount > 0 ? (sumX / validCount) : 0;

        // 3. Calculate Y (Deviation) and Z (Squared Deviation)
        let sumZ = 0;
        const finalData = processedData.map(item => {
            if (item.x === 0) return { ...item, y: 0, z: 0 };

            const y = item.x - grandMean;
            const z = y * y;
            sumZ += z;

            return {
                ...item,
                y: y,
                z: z
            };
        });

        // 4. Calculate SD using totalEntries (n)
        const sd = totalEntries > 0 ? Math.sqrt(sumZ / totalEntries) : 0;

        setStats({
            grandMean: grandMean.toFixed(2),
            totalZ: sumZ.toFixed(4),
            sd: sd.toFixed(4),
            totalFaculty: totalEntries // Display n as total number of entries
        });

        return finalData;
    };

    const fetchFeedback = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        setFeedbacks([]);
        setStats({ grandMean: 0, totalZ: 0, sd: 0, totalFaculty: 0 });

        try {
            const params = {
                department: filters.department,
                feedbackRound: filters.feedbackRound,
                groupBy: 'faculty' // Fetch aggregated by faculty
            };

            const response = await api.get('/feedback/summary', { params });

            if (response.data.success) {
                const calculatedData = calculateStats(response.data.data);
                setFeedbacks(calculatedData);
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

    return (
        <div className="feedback-retrieval">
            <h2 className="page-title no-print">Department Feedback Analysis Report</h2>

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
                            DEPARTMENT {filters.department === 'Computer - AIML' ? 'COMPUTER SCIENCE ENGINEERING - AIML' : filters.department.toUpperCase()}
                        </h3>
                        <h4 style={{ margin: '5px 0', textTransform: 'uppercase' }}>
                            ACADEMIC YEAR {new Date().getFullYear()}-{new Date().getFullYear() + 1} ({['1', '2'].includes(filters.feedbackRound) ? (filters.feedbackRound === '1' ? 'ODD SEM' : 'EVEN SEM') : 'ALL ROUNDS'})
                        </h4>
                        <h4 style={{ margin: '5px 0', fontWeight: 'bold' }}>
                            FEEDBACK ANALYSIS REPORT
                        </h4>
                        <div style={{ textAlign: 'right', marginTop: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            DATE:- {new Date().toLocaleDateString('en-GB')}
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '0.9rem' }}>
                            <thead>
                                <tr>
                                    <th style={{ border: '2px solid #000', padding: '8px', textAlign: 'center' }}>SR NO.</th>
                                    <th style={{ border: '2px solid #000', padding: '8px', textAlign: 'left' }}>NAME</th>
                                    <th style={{ border: '2px solid #000', padding: '8px', textAlign: 'center' }}>F1(TH)</th>
                                    <th style={{ border: '2px solid #000', padding: '8px', textAlign: 'center' }}>F1(PR)</th>
                                    <th style={{ border: '2px solid #000', padding: '8px', textAlign: 'center' }}>TOTAL</th>
                                    <th style={{ border: '2px solid #000', padding: '8px', textAlign: 'center' }}>X</th>
                                    <th style={{ border: '2px solid #000', padding: '8px', textAlign: 'center' }}>Y=X-{stats.grandMean}</th>
                                    <th style={{ border: '2px solid #000', padding: '8px', textAlign: 'center' }}>Z=Y*Y</th>
                                </tr>
                            </thead>
                            <tbody>
                                {feedbacks.map((item, index) => (
                                    <tr key={item.facultyId}>
                                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{index + 1}</td>
                                        <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{item.facultyName}</td>
                                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.th || '-'}</td>
                                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.pr || '-'}</td>
                                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.totalScore}</td>
                                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.x > 0 ? item.x.toFixed(2) : '-'}</td>
                                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.y !== undefined ? item.y.toFixed(2) : '-'}</td>
                                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.z !== undefined ? item.z.toFixed(4) : '-'}</td>
                                    </tr>
                                ))}
                                {/* Footer calculation row */}
                                <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                                    <td colSpan={5} style={{ border: '1px solid #000' }}></td>
                                    <td style={{ border: '2px solid #000', padding: '8px', textAlign: 'center' }}>{stats.grandMean}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Total (ΣZ)</td>
                                    <td style={{ border: '2px solid #000', padding: '8px', textAlign: 'center' }}>{stats.totalZ}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '20px', paddingLeft: '50px', fontSize: '1.1rem' }}>
                        <p><strong>SD = √(ΣZ/n) = √{stats.totalZ}/{stats.totalFaculty}</strong></p>
                        <p><strong>SD = {stats.sd}</strong></p>
                    </div>

                    <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', padding: '0 20px', breakInside: 'avoid' }}>
                        <div style={{ textAlign: 'center', minWidth: '150px' }}>
                            <p style={{ fontWeight: 'bold', borderTop: '1px solid black', paddingTop: '5px' }}>Academic Coordinator</p>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '100px' }}>
                            <p style={{ fontWeight: 'bold', borderTop: '1px solid black', paddingTop: '5px' }}>HOD</p>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '150px' }}>
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

export default DepartmentAnalysisReport;
