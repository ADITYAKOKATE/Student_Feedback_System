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

            // Set custom header for student token manually since interceptor might default to admin token? 
            // Actually, if we use the same `api` instance and `localStorage.setItem('token', ...)` it might conflict
            // Admin uses 'token', Student uses 'studentToken'. 
            // We need to ensure Axios uses the correct token.
            // For now, let's manually pass it in headers.
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            const response = await api.get('/feedback/form-data', config);
            if (response.data.success) {
                setFormData(response.data.data);
                setStudentInfo(response.data.data.studentInfo);
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
            [`${section}-${id}-${questionIndex}`]: value
        }));
    };

    // For single forms (Library/Facilities), id is static
    const handleGenericRatingChange = (section, questionIndex, value) => {
        setResponses(prev => ({
            ...prev,
            [`${section}-general-${questionIndex}`]: value
        }));
    };

    const isTabComplete = (tabName) => {
        if (!formData) return false;

        if (tabName === 'theory') {
            // Check if all questions for all theory faculty are answered
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
            // Last question is suggestions (text), others are ratings
            return questions.library.slice(0, 4).every((_, qIndex) => responses[`library-general-${qIndex}`]);
        }
        if (tabName === 'facilities') {
            // Last question is suggestions (text)
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
        // Transform responses into API payload
        // This part needs careful mapping
        /* 
           Payload structure expected by backend?
           Backend expects single feedback objects? Or specific endpoint?
           We created general `submitFeedback` endpoint in the past which takes:
           { facultyId, feedbackType, ratings (Map), comments }
           
           We should probably hit the endpoint multiple times or update backend to accept bulk.
           Actually, the backend `submitFeedback` handles one at a time.
           Ideally we should create a `bulkSubmitFeedback` endpoint. 
           But to save time, let's loop client side or (better) create a new endpoint.
           
           Let's update plan: create `submitBulkFeedback` end point later? 
           Checking `feedbackController.js`, `submitFeedback` is for single.
           
           Let's loop for now (easier implemented without changing backend again immediately).
        */

        const token = localStorage.getItem('studentToken');
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            // Submit Theory
            for (const faculty of formData.theoryFaculty) {
                const ratings = {};
                questions.theory.forEach((q, i) => ratings[`q${i + 1}`] = responses[`theory-${faculty._id}-${i}`]);
                await api.post('/feedback/submit', {
                    facultyId: faculty._id,
                    feedbackType: 'theory',
                    ratings,
                    comments: ''
                }, config);
            }

            // Submit Practical
            for (const faculty of formData.practicalFaculty) {
                const ratings = {};
                questions.practical.forEach((q, i) => ratings[`q${i + 1}`] = responses[`practical-${faculty._id}-${i}`]);
                await api.post('/feedback/submit', {
                    facultyId: faculty._id,
                    feedbackType: 'practical',
                    ratings,
                    comments: ''
                }, config);
            }

            // Submit Library (Need a dummy faculty or handle in backend? Model requires Faculty ID)
            // Issue: Model requires Faculty ID. 
            // Fix: We need a "General" faculty or update backend to make faculty fully optional.
            // I updated model to make faculty optional for library/facilities.
            // But `submitFeedback` controller checks `if (!facultyId) ...`.
            // I need to update `submitFeedback` controller to handle optional facultyId.

            // STOP: I need to fix backend controller first.

            // Assuming I fix it:
            const libRatings = {};
            questions.library.slice(0, 4).forEach((q, i) => libRatings[`q${i + 1}`] = responses[`library-general-${i}`]);
            await api.post('/feedback/submit', {
                feedbackType: 'library',
                ratings: libRatings,
                comments: responses[`library-general-4`] || '' // Suggestions
            }, config);

            const facRatings = {};
            questions.facilities.slice(0, 12).forEach((q, i) => facRatings[`q${i + 1}`] = responses[`facilities-general-${i}`]);
            await api.post('/feedback/submit', {
                feedbackType: 'other_facilities',
                ratings: facRatings,
                comments: responses[`facilities-general-12`] || '' // Suggestions
            }, config);

            setMessage({ type: 'success', text: 'Feedback submitted successfully!' });
            setTimeout(() => {
                localStorage.removeItem('studentToken');
                navigate('/student/login');
            }, 2000);

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Error submitting feedback. Please try again.' });
            setLoading(false);
        }
    };

    if (loading && !formData) return <div className="loader">Loading...</div>;

    return (
        <div className="feedback-wizard">
            <header className="wizard-header">
                <h3>Student Feedback</h3>
                {studentInfo && (
                    <div className="student-badge">
                        <span>{studentInfo.class} {studentInfo.division} {studentInfo.department}</span>
                        <span>{new Date().toDateString()}</span>
                    </div>
                )}
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
                                        onChange={(e) => handleGenericRatingChange('library', idx, e.target.value)}
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
                                        onChange={(e) => handleGenericRatingChange('facilities', idx, e.target.value)}
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
