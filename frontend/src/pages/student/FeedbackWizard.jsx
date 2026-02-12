import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import './FeedbackWizard.css';
import { feedbackQuestions } from '../../utils/feedbackQuestions';

const FeedbackWizard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState(null);
    const [activeTab, setActiveTab] = useState('theory');
    const [responses, setResponses] = useState({});
    const [message, setMessage] = useState({ type: '', text: '' });
    const [studentInfo, setStudentInfo] = useState(null);

    const [isSubmitted, setIsSubmitted] = useState(false);

    // Questions Data
    const questions = feedbackQuestions;

    const likertOptions = [
        { value: 5, label: "5. Excellent" },
        { value: 4, label: "4. Good" },
        { value: 3, label: "3. Satisfactory" },
        { value: 2, label: "2. Average" },
        { value: 1, label: "1. Needs Improvement" }
    ];

    useEffect(() => {
        fetchFormData();
    }, []);

    const fetchFormData = async () => {
        try {
            const token = localStorage.getItem('studentToken');
            if (!token) {
                navigate('/student/login');
                return;
            }

            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            const response = await api.get('/feedback/form-data', config);
            if (response.data.success) {
                setFormData(response.data.data);
                setStudentInfo(response.data.data.studentInfo);
                setIsSubmitted(response.data.data.isSubmitted);
            }
        } catch (error) {
            console.error(error);
            if (error.response?.status === 401) {
                navigate('/student/login');
            } else {
                setMessage({ type: 'error', text: 'Failed to load feedback form.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRatingChange = (section, id, questionIndex, value) => {
        setResponses(prev => ({
            ...prev,
            [`${section}-${id}-${questionIndex}`]: parseInt(value)
        }));
    };

    // For single forms (Library/Facilities), id is static
    const handleGenericRatingChange = (section, questionIndex, value) => {
        setResponses(prev => ({
            ...prev,
            [`${section}-general-${questionIndex}`]: questionIndex === (questions.library.length - 1) && section === 'library' || questionIndex === (questions.facilities.length - 1) && section === 'facilities' ? value : parseInt(value)
        }));
    };

    // Note: The above logic for generically handling text vs number needs checking index carefully.
    // Library: 5 questions. Indexes 0-3 are ratings. Index 4 is text.
    // Facilities: 13 questions. Indexes 0-11 are ratings. Index 12 is text.

    const handleTextChange = (section, idx, value) => {
        setResponses(prev => ({
            ...prev,
            [`${section}-general-${idx}`]: value
        }));
    };

    const isTabComplete = (tabName) => {
        if (!formData) return false;

        if (tabName === 'theory') {
            return formData.theoryFaculty.every(faculty =>
                questions.theory.every((_, qIndex) => responses[`theory-${faculty._id}-${qIndex}`])
            );
        }
        if (tabName === 'practical') {
            return formData.practicalFaculty.every(faculty =>
                questions.practical.every((_, qIndex) => responses[`practical-${faculty._id}-${qIndex}`])
            );
        }
        if (tabName === 'library') {
            // Check first 4 ratings
            return questions.library.slice(0, 4).every((_, qIndex) => responses[`library-general-${qIndex}`]);
        }
        if (tabName === 'facilities') {
            // Check first 12 ratings
            return questions.facilities.slice(0, 12).every((_, qIndex) => responses[`facilities-general-${qIndex}`]);
        }
        return false;
    };

    const handleSubmit = async () => {
        if (!isTabComplete('theory') || !isTabComplete('practical') || !isTabComplete('library') || !isTabComplete('facilities')) {
            setMessage({ type: 'error', text: 'Please complete all sections before submitting.' });
            return;
        }

        if (!window.confirm("Are you sure you want to submit? You cannot edit after submission.")) return;

        setLoading(true);
        const token = localStorage.getItem('studentToken');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            // Construct Theory Array
            const theory = formData.theoryFaculty.map(faculty => {
                const ratings = {};
                questions.theory.forEach((q, i) => ratings[`q${i + 1}`] = responses[`theory-${faculty._id}-${i}`]);
                return {
                    faculty: faculty._id,
                    subject: faculty.subjectName,
                    ratings,
                    comments: ''
                };
            });

            // Construct Practical Array
            const practical = formData.practicalFaculty.map(faculty => {
                const ratings = {};
                questions.practical.forEach((q, i) => ratings[`q${i + 1}`] = responses[`practical-${faculty._id}-${i}`]);
                return {
                    faculty: faculty._id,
                    subject: faculty.subjectName,
                    ratings,
                    comments: ''
                };
            });

            // Construct Library Object
            const libRatings = {};
            questions.library.slice(0, 4).forEach((q, i) => libRatings[`q${i + 1}`] = responses[`library-general-${i}`]);
            const library = {
                ratings: libRatings,
                comments: responses[`library-general-4`] || '' // Suggestion is the last one (index 4)
            };

            // Construct Facilities Object
            const facRatings = {};
            questions.facilities.slice(0, 12).forEach((q, i) => facRatings[`q${i + 1}`] = responses[`facilities-general-${i}`]);
            const facilities = {
                ratings: facRatings,
                comments: responses[`facilities-general-12`] || '' // Suggestion is the last one (index 12)
            };

            const payload = { theory, practical, library, facilities };

            await api.post('/feedback/submit', payload, config);

            setMessage({ type: 'success', text: 'Feedback submitted successfully!' });
            setIsSubmitted(true); // Update local state to show success screen immediately

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Error submitting feedback. Please try again.' });
            setLoading(false);
        }
    };

    if (loading && !formData) return <div className="loader">Loading...</div>;

    if (isSubmitted) {
        return (
            <div className="feedback-wizard submitted-state">
                <div className="card text-center p-5">
                    <div className="mb-4">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" fill="#4CAF50" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M7.75 12.75L10.58 15.58L16.25 9.92001" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h3>Feedback Already Submitted</h3>
                    <p className="text-muted mt-2">Thank you for your valuable feedback! Your response has been recorded.</p>
                    <button className="btn btn-primary mt-4" onClick={() => {
                        localStorage.removeItem('studentToken');
                        navigate('/student/login');
                    }}>
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="feedback-wizard">
            <header className="wizard-header">
                <div className="header-content">
                    <h3>Student Feedback {formData?.activeRound ? `(Round ${formData.activeRound})` : ''}</h3>
                    {studentInfo && (
                        <div className="student-badge">
                            <span>{studentInfo.class} {studentInfo.division} {studentInfo.department}</span>
                            <span>{new Date().toDateString()}</span>
                        </div>
                    )}
                </div>
                {/* Reset button removed as per requirement */}
            </header>

            {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

            <div className="tabs">
                <button className={activeTab === 'theory' ? 'active' : ''} onClick={() => setActiveTab('theory')}>Theory Feedback</button>
                <button className={activeTab === 'practical' ? 'active' : ''} onClick={() => setActiveTab('practical')}>Practical Feedback</button>
                <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>Library</button>
                <button className={activeTab === 'facilities' ? 'active' : ''} onClick={() => setActiveTab('facilities')}>Other Facilities</button>
            </div>

            <div className="tab-content">
                {activeTab === 'theory' && (
                    <div className="section-container">
                        {formData.theoryFaculty.map(faculty => (
                            <div key={faculty._id} className="faculty-card">
                                <h4>{faculty.facultyName} <small>({faculty.subjectName})</small></h4>
                                {questions.theory.map((q, idx) => (
                                    <div key={idx} className="question-row">
                                        <p>{idx + 1}. {q}</p>
                                        <select
                                            value={responses[`theory-${faculty._id}-${idx}`] || ''}
                                            onChange={(e) => handleRatingChange('theory', faculty._id, idx, e.target.value)}
                                            className="rating-select"
                                        >
                                            <option value="">Select one</option>
                                            {likertOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'practical' && (
                    <div className="section-container">
                        {formData.practicalFaculty.map(faculty => (
                            <div key={faculty._id} className="faculty-card">
                                <h4>{faculty.facultyName} <small>({faculty.subjectName})</small></h4>
                                {questions.practical.map((q, idx) => (
                                    <div key={idx} className="question-row">
                                        <p>{idx + 1}. {q}</p>
                                        <select
                                            value={responses[`practical-${faculty._id}-${idx}`] || ''}
                                            onChange={(e) => handleRatingChange('practical', faculty._id, idx, e.target.value)}
                                            className="rating-select"
                                        >
                                            <option value="">Select one</option>
                                            {likertOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'library' && (
                    <div className="section-container">
                        <h4>Library Facilities</h4>
                        {questions.library.map((q, idx) => (
                            <div key={idx} className="question-row">
                                <p>{idx + 1}. {q}</p>
                                {idx < 4 ? (
                                    <select
                                        value={responses[`library-general-${idx}`] || ''}
                                        onChange={(e) => handleGenericRatingChange('library', idx, e.target.value)}
                                        className="rating-select"
                                    >
                                        <option value="">Select one</option>
                                        {likertOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <textarea
                                        className="suggestion-box"
                                        placeholder="Enter suggestions here..."
                                        value={responses[`library-general-${idx}`] || ''}
                                        onChange={(e) => handleTextChange('library', idx, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'facilities' && (
                    <div className="section-container">
                        <h4>Other Facilities</h4>
                        {questions.facilities.map((q, idx) => (
                            <div key={idx} className="question-row">
                                <p>{idx + 1}. {q}</p>
                                {idx < 12 ? (
                                    <select
                                        value={responses[`facilities-general-${idx}`] || ''}
                                        onChange={(e) => handleGenericRatingChange('facilities', idx, e.target.value)}
                                        className="rating-select"
                                    >
                                        <option value="">Select one</option>
                                        {likertOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <textarea
                                        className="suggestion-box"
                                        placeholder="Enter suggestions here..."
                                        value={responses[`facilities-general-${idx}`] || ''}
                                        onChange={(e) => handleTextChange('facilities', idx, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="wizard-footer">
                {activeTab === 'facilities' ? (
                    <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                ) : (
                    <button className="next-btn" onClick={() => {
                        const tabs = ['theory', 'practical', 'library', 'facilities'];
                        const currentIndex = tabs.indexOf(activeTab);
                        setActiveTab(tabs[currentIndex + 1]);
                    }}>Next &gt;</button>
                )}
            </div>
        </div>
    );
};

export default FeedbackWizard;
