import { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import api from '../../utils/api';
import './Reports.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

const Reports = () => {
    const [stats, setStats] = useState(null);
    const [deptDistribution, setDeptDistribution] = useState([]);
    const [topFaculty, setTopFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReportData();
    }, []);

    const fetchReportData = async () => {
        try {
            setLoading(true);
            const [statsRes, deptRes, facultyRes] = await Promise.all([
                api.get('/reports/stats'),
                api.get('/reports/department-distribution'),
                api.get('/reports/top-faculty')
            ]);

            setStats(statsRes.data.data);
            setDeptDistribution(deptRes.data.data);
            setTopFaculty(facultyRes.data.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching report data:', err);
            setError('Failed to load reports. Please try again.');
            setLoading(false);
        }
    };

    if (loading) return <div className="reports-loading"><div className="spinner"></div><p>Loading analytics...</p></div>;
    if (error) return <div className="reports-error">{error}</div>;

    // Chart Data Preparation
    const barChartData = {
        labels: deptDistribution.map(d => d.department || 'Unknown'),
        datasets: [
            {
                label: 'Feedback Count',
                data: deptDistribution.map(d => d.count),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
        ],
    };

    const pieChartData = {
        labels: ['Theory', 'Practical'],
        datasets: [
            {
                label: 'Average Rating',
                data: [stats.theoryAvg, stats.practicalAvg],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(75, 192, 192, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="reports-container">
            <h1 className="page-title">Feedback Analysis & Reports</h1>

            {/* Overall Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Feedback</h3>
                    <p className="stat-value">{stats.totalFeedback}</p>
                    <p className="stat-label">Submissions</p>
                </div>
                <div className="stat-card">
                    <h3>Total Students</h3>
                    <p className="stat-value">{stats.totalStudents}</p>
                    <p className="stat-label">Registered</p>
                </div>
                <div className="stat-card">
                    <h3>Total Faculty</h3>
                    <p className="stat-value">{stats.totalFaculty}</p>
                    <p className="stat-label">Active</p>
                </div>
                <div className="stat-card highlight">
                    <h3>Avg Theory Rating</h3>
                    <p className="stat-value">{stats.theoryAvg} / 5</p>
                    <div className="progress-bar">
                        <div className="progress" style={{ width: `${(stats.theoryAvg / 5) * 100}%` }}></div>
                    </div>
                </div>
                <div className="stat-card highlight">
                    <h3>Avg Practical Rating</h3>
                    <p className="stat-value">{stats.practicalAvg} / 5</p>
                    <div className="progress-bar">
                        <div className="progress" style={{ width: `${(stats.practicalAvg / 5) * 100}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                <div className="chart-container">
                    <h3>Department-wise Feedback Volume</h3>
                    <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
                </div>
                <div className="chart-container">
                    <h3>Theory vs Practical Performance</h3>
                    <Pie data={pieChartData} options={{ maintainAspectRatio: false }} />
                </div>
            </div>

            {/* Top Faculty Section */}
            <div className="top-faculty-section">
                <h3>Top Performing Faculty</h3>
                <div className="table-responsive">
                    <table className="top-faculty-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Faculty Name</th>
                                <th>Subject</th>
                                <th>Avg Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topFaculty.map((faculty, index) => (
                                <tr key={faculty._id}>
                                    <td>
                                        <span className={`rank-badge rank-${index + 1}`}>#{index + 1}</span>
                                    </td>
                                    <td>{faculty.name}</td>
                                    <td>{faculty.subject}</td>
                                    <td>
                                        <div className="rating-pill">
                                            {faculty.avgRating} <span className="star">★</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {topFaculty.length === 0 && (
                                <tr><td colSpan="4">No data available</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
