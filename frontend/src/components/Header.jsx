import { useState, useEffect } from 'react';
import api from '../utils/api';
import './Header.css';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';

const Header = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isFeedbackActive, setIsFeedbackActive] = useState(false);
    const [activeRound, setActiveRound] = useState('1');

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await api.get('/config/feedback-status');
                setIsFeedbackActive(res.data.isActive);
                setActiveRound(res.data.activeRound || '1');
            } catch (error) {
                console.error('Error fetching feedback status', error);
            }
        };
        if (user && user.role === 'admin') {
            fetchStatus();
        }
    }, [user]);

    const handleToggleFeedback = async () => {
        try {
            const newState = !isFeedbackActive;
            const res = await api.post('/config/toggle-feedback', { isActive: newState, activeRound });
            if (res.data.success) {
                setIsFeedbackActive(newState);
                // alert(`Feedback session ${newState ? 'ACTIVATED' : 'DEACTIVATED'}`);
            }
        } catch (error) {
            console.error('Error toggling feedback', error);
            alert('Failed to update feedback status');
        }
    };

    const handleRoundChange = async (e) => {
        const newRound = e.target.value;
        setActiveRound(newRound);
        try {
            // Update backend immediately
            const res = await api.post('/config/toggle-feedback', { isActive: isFeedbackActive, activeRound: newRound });
            if (res.data.success) {
                // success
            }
        } catch (error) {
            console.error('Error updating round', error);
            alert('Failed to update feedback round');
        }
    }

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
        setIsMenuOpen(false);
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    return (
        <header className="header">
            <div className="container">
                <div className="header-content">
                    <div className="header-left">
                        <Link to="/admin/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <h1 className="header-title">Saraswati College of Engineering</h1>
                        </Link>
                        <button className="mobile-menu-btn" onClick={toggleMenu}>
                            {isMenuOpen ? <FaTimes /> : <FaBars />}
                        </button>
                    </div>

                    {/* Feedback Toggle (Admin Only) */}
                    {user && user.role === 'admin' && (
                        <div className="feedback-control-group" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div className="feedback-toggle-container" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <select
                                    value={activeRound}
                                    onChange={handleRoundChange}
                                    style={{
                                        padding: '5px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        fontSize: '0.9rem',
                                        background: '#fff',
                                        color: '#333'
                                    }}
                                >
                                    <option value="1">Round 1</option>
                                    <option value="2">Round 2</option>
                                </select>

                                <span className={isFeedbackActive ? "status-active" : "status-inactive"}>
                                    {isFeedbackActive ? 'ON' : 'OFF'}
                                </span>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={isFeedbackActive}
                                        onChange={handleToggleFeedback}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            {isFeedbackActive && (
                                <div className="feedback-link-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '4px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#fff', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {window.location.origin}/student/login
                                    </span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/student/login`);
                                            alert('Link copied to clipboard!');
                                        }}
                                        style={{
                                            background: '#fff',
                                            color: '#333',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '2px 8px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold'
                                        }}
                                        title="Copy Link"
                                    >
                                        Copy
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <nav className={`header-nav ${isMenuOpen ? 'active' : ''}`}>
                        <Link to="/admin/faculty-registration" className="nav-link" onClick={closeMenu}>
                            Register Faculty
                        </Link>
                        <Link to="/admin/student-registration" className="nav-link" onClick={closeMenu}>
                            Register Student
                        </Link>

                        <div className="dropdown">
                            <span className="nav-link dropdown-toggle">Feedback ▼</span>
                            <div className="dropdown-menu">
                                <Link to="/admin/theory-feedback" className="dropdown-item" onClick={closeMenu}>
                                    Theory
                                </Link>
                                <Link to="/admin/practical-feedback" className="dropdown-item" onClick={closeMenu}>
                                    Practical
                                </Link>
                                <Link to="/admin/facilities-feedback" className="dropdown-item" onClick={closeMenu}>
                                    Library & Facilities
                                </Link>
                                <Link to="/admin/department-feedback" className="dropdown-item" onClick={closeMenu}>
                                    Department Theory
                                </Link>
                                <Link to="/admin/department-practical-feedback" className="dropdown-item" onClick={closeMenu}>
                                    Department Practical
                                </Link>
                                <Link to="/admin/analysis-report" className="dropdown-item" onClick={closeMenu}>
                                    Analysis Report
                                </Link>
                            </div>
                        </div>

                        <Link to="/admin/reports" className="nav-link" onClick={closeMenu}>
                            Reports
                        </Link>

                        {user?.role === 'admin' && (
                            <span className="nav-link" style={{
                                background: '#ffc107',
                                color: '#000',
                                fontWeight: 'bold',
                                padding: '5px 10px',
                                borderRadius: '20px',
                                marginRight: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                👤 {user.username || 'Admin'}
                            </span>
                        )}


                        <button onClick={handleLogout} className="nav-link logout-btn">
                            Logout
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default Header;
