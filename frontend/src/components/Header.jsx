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

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await api.get('/config/feedback-status');
                setIsFeedbackActive(res.data.isActive);
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
            const res = await api.post('/config/toggle-feedback', { isActive: newState });
            if (res.data.success) {
                setIsFeedbackActive(newState);
                alert(`Feedback session ${newState ? 'ACTIVATED' : 'DEACTIVATED'}`);
            }
        } catch (error) {
            console.error('Error toggling feedback', error);
            alert('Failed to update feedback status');
        }
    };

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
                        <h1 className="header-title">Saraswati College of Engineering</h1>
                        <button className="mobile-menu-btn" onClick={toggleMenu}>
                            {isMenuOpen ? <FaTimes /> : <FaBars />}
                        </button>
                    </div>

                    {/* Feedback Toggle (Admin Only) */}
                    {/* Feedback Toggle (Admin Only) */}
                    {user && user.role === 'admin' && (
                        <div className="feedback-control-group" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div className="feedback-toggle-container">
                                <span className={isFeedbackActive ? "status-active" : "status-inactive"}>
                                    Feedback: {isFeedbackActive ? 'ON' : 'OFF'}
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
                            </div>
                        </div>

                        <Link to="/admin/reports" className="nav-link" onClick={closeMenu}>
                            Reports
                        </Link>


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
