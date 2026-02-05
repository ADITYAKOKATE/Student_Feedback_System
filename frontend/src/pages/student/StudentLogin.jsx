import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './StudentLogin.css';

const StudentLogin = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const configResponse = await api.get('/config/feedback-status');
            if (!configResponse.data.isActive) {
                setError('Feedback session is currently inactive.');
                setLoading(false);
                return;
            }

            const response = await api.post('/auth/student/login', formData);
            if (response.data.success) {
                localStorage.setItem('studentToken', response.data.token);
                localStorage.setItem('studentInfo', JSON.stringify(response.data.user));
                navigate('/student/feedback');
            }
        } catch (err) {
            console.error("Login Error:", err);
            const msg = err.response?.data?.message || err.message || 'Login failed';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="student-login-container">
            <div className="student-login-card">
                <div className="student-login-header">
                    <div className="student-icon-wrapper">
                        👨‍🎓
                    </div>
                    <h2>Welcome Back</h2>
                    <p>Enter your credentials to access the feedback portal</p>
                </div>

                {error && (
                    <div className="error-banner">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="student-login-form">
                    <div className="form-group">
                        <label htmlFor="username">GR Number / Username</label>
                        <div className="input-wrapper">
                            <span className="input-icon">👤</span>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                className="student-input"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                placeholder="e.g. 123456"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className="student-input"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button type="submit" className="student-login-btn" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Access Portal'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudentLogin;
