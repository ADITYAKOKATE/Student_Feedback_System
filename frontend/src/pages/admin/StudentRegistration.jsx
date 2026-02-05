import { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaKey, FaCheckCircle, FaUndo } from 'react-icons/fa';
import api from '../../utils/api';
import './StudentRegistration.css';

const StudentRegistration = () => {
    const [formData, setFormData] = useState({
        grNo: '',
        username: '',
        password: '',
        department: 'Computer - AIML',
        class: 'SE', // Default to SE
        division: 'A',
        practicalBatch: 'A',
        eligibility: true,
        electiveChosen: '',
    });

    const [studentList, setStudentList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [electives, setElectives] = useState([]);
    const [fetchingElectives, setFetchingElectives] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // UI State
    const [activeTab, setActiveTab] = useState('SE');
    const [filterDivision, setFilterDivision] = useState('All');
    const [filterBatch, setFilterBatch] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [editingId, setEditingId] = useState(null);

    const classes = ['SE', 'TE', 'BE'];
    const divisions = ['A', 'B', 'C'];
    const batches = ['A', 'B', 'C', 'D'];

    useEffect(() => {
        fetchStudents();
        setSelectedStudentIds([]); // Clear selection on tab change
    }, [activeTab]);

    // Fetch electives when class changes in the form
    useEffect(() => {
        if (formData.class) {
            fetchElectives();
        }
    }, [formData.class, formData.department]);

    const fetchElectives = async () => {
        setFetchingElectives(true);
        try {
            const response = await api.get('/faculty', {
                params: {
                    class: formData.class,
                    isElective: true,
                    department: formData.department
                }
            });
            if (response.data.success) {
                // Extract unique subject names
                const subjects = [...new Set(response.data.data.map(f => f.subjectName))];
                setElectives(subjects);
            }
        } catch (error) {
            console.error('Error fetching electives:', error);
        } finally {
            setFetchingElectives(false);
        }
    };

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/students?class=${activeTab}`);
            if (response.data.success) {
                setStudentList(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            setMessage({ type: 'error', text: 'Error fetching student list' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const resetForm = () => {
        setFormData({
            grNo: '',
            username: '',
            password: '',
            department: 'Computer - AIML',
            class: 'SE', // Default to SE
            division: 'A',
            practicalBatch: 'A',
            eligibility: true,
            electiveChosen: '',
        });
        setEditingId(null);
        // Don't clear selectedIds here to allow action continuation
    };

    const handleEdit = (student) => {
        setFormData({
            grNo: student.grNo,
            username: student.username,
            password: '', // Don't populate password
            department: student.department || 'Computer - AIML',
            class: student.class || 'SE',
            division: student.division || 'A',
            practicalBatch: student.practicalBatch || 'A',
            eligibility: student.eligibility,
            electiveChosen: student.electiveChosen || '',
        });
        setEditingId(student._id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setMessage({ type: 'info', text: 'Editing student details. Leave password empty to keep unchanged.' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            let response;
            if (editingId) {
                // Remove password if empty during update
                const dataToUpdate = { ...formData };
                if (!dataToUpdate.password) delete dataToUpdate.password;

                response = await api.put(`/students/${editingId}`, dataToUpdate);
            } else {
                response = await api.post('/students/register', formData);
            }

            if (response.data.success) {
                setMessage({
                    type: 'success',
                    text: editingId ? 'Student updated successfully!' : 'Student registered successfully!'
                });
                resetForm();
                fetchStudents();
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Error processing request',
            });
        } finally {
            setLoading(false);
        }
    };

    // Helper for bulk processing
    const processBulkAction = async (actionName, actionFn) => {
        if (!selectedStudentIds.length) return;

        const confirmMsg = selectedStudentIds.length === 1
            ? `Are you sure you want to ${actionName} this student?`
            : `Are you sure you want to ${actionName} these ${selectedStudentIds.length} students?`;

        if (!window.confirm(confirmMsg)) return;

        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        for (const id of selectedStudentIds) {
            try {
                // For Reset Password we need GR No, which we might not have if we just have IDs. 
                // We need to look it up or change the logic.
                // Updated: Look up student object
                const student = studentList.find(s => s._id === id);
                if (student) {
                    await actionFn(student);
                    successCount++;
                }
            } catch (error) {
                console.error(`Failed to ${actionName} for ${id}`, error);
                failCount++;
            }
        }

        setLoading(false);
        setMessage({
            type: failCount === 0 ? 'success' : 'warning',
            text: `Bulk ${actionName}: ${successCount} success, ${failCount} failed.`
        });

        fetchStudents();
        setSelectedStudentIds([]);
    };

    const handleBulkAction = (actionType) => {
        switch (actionType) {
            case 'edit':
                if (selectedStudentIds.length !== 1) return;
                const studentToEdit = studentList.find(s => s._id === selectedStudentIds[0]);
                if (studentToEdit) handleEdit(studentToEdit);
                break;

            case 'delete':
                processBulkAction('delete', async (student) => {
                    await api.delete(`/students/${student._id}`);
                });
                break;

            case 'resetFeedback':
                processBulkAction('reset feedback', async (student) => {
                    await api.patch(`/students/${student._id}/reset-feedback`, { feedbackType: 'both' });
                });
                break;

            case 'resetPassword':
                processBulkAction('reset password', async (student) => {
                    await api.patch(`/students/${student._id}/reset-password`);
                });
                break;

            case 'toggleEligibility':
                processBulkAction('toggle eligibility', async (student) => {
                    await api.patch(`/students/${student._id}/toggle-eligibility`);
                });
                break;

            default:
                break;
        }
    };

    const toggleSelectAll = (filteredStudents) => {
        if (selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(filteredStudents.map(s => s._id));
        }
    };

    const toggleSelectStudent = (id) => {
        setSelectedStudentIds(prev =>
            prev.includes(id)
                ? prev.filter(sid => sid !== id)
                : [...prev, id]
        );
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target.result;
            const lines = text.split('\n');
            const data = [];

            // Expected Header: GR No,Username,Password,Department,Class,Division,Batch
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const cols = line.split(',');
                if (cols.length < 7) continue;

                data.push({
                    grNo: cols[0]?.trim(),
                    username: cols[1]?.trim(),
                    password: cols[2]?.trim(),
                    department: cols[3]?.trim() || 'Computer - AIML',
                    class: cols[4]?.trim(),
                    division: cols[5]?.trim(),
                    practicalBatch: cols[6]?.trim()
                });
            }

            if (data.length === 0) {
                setMessage({ type: 'error', text: 'No valid data found in CSV.' });
                return;
            }

            if (window.confirm(`Found ${data.length} student entries. Upload now?`)) {
                setLoading(true);
                try {
                    const response = await api.post('/students/bulk-register', data);
                    if (response.data.success) {
                        setMessage({ type: 'success', text: `Successfully registered ${response.data.count} students!` });
                        fetchStudents();
                    }
                } catch (error) {
                    setMessage({ type: 'error', text: error.response?.data?.message || 'Error uploading bulk data.' });
                } finally {
                    setLoading(false);
                    e.target.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    const renderStudentTable = () => {
        const filteredStudents = studentList.filter(student => {
            const matchesDivision = filterDivision === 'All' || student.division === filterDivision;
            const matchesBatch = filterBatch === 'All' || student.practicalBatch === filterBatch;
            const matchesSearch =
                (student.grNo && student.grNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (student.username && student.username.toLowerCase().includes(searchQuery.toLowerCase()));

            return matchesDivision && matchesBatch && matchesSearch;
        });

        // Sort by Division then GR No
        filteredStudents.sort((a, b) => {
            if (a.division < b.division) return -1;
            if (a.division > b.division) return 1;
            return a.grNo.localeCompare(b.grNo);
        });

        const isAllSelected = filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length;

        return (
            <table>
                <thead>
                    <tr>
                        <th style={{ width: '50px' }}>
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={() => toggleSelectAll(filteredStudents)}
                                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                            />
                        </th>
                        <th>Gr No.</th>
                        <th>Username</th>
                        <th>Div</th>
                        <th>Batch</th>
                        <th>Eligible</th>
                        <th>Feedback given?</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredStudents.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="text-center">
                                No students found matching criteria
                            </td>
                        </tr>
                    ) : (
                        filteredStudents.map((student) => (
                            <tr
                                key={student._id}
                                className={selectedStudentIds.includes(student._id) ? 'selected-row' : ''}
                                style={{ backgroundColor: selectedStudentIds.includes(student._id) ? 'rgba(52, 152, 219, 0.1)' : 'transparent' }}
                            >
                                <td data-label="Select">
                                    <input
                                        type="checkbox"
                                        checked={selectedStudentIds.includes(student._id)}
                                        onChange={() => toggleSelectStudent(student._id)}
                                        style={{ accentColor: '#3498db', transform: 'scale(1.2)', cursor: 'pointer' }}
                                    />
                                </td>
                                <td data-label="Gr No.">{student.grNo}</td>
                                <td data-label="Username">{student.username}</td>
                                <td data-label="Div">{student.division}</td>
                                <td data-label="Batch">{student.practicalBatch}</td>
                                <td data-label="Eligible">
                                    <span className={`badge ${student.eligibility ? 'badge-success' : 'badge-danger'}`}>
                                        {student.eligibility ? 'Yes' : 'No'}
                                    </span>
                                </td>
                                <td data-label="Feedback given?">
                                    {student.feedbackGiven?.theory || student.feedbackGiven?.practical
                                        ? 'Yes'
                                        : 'No'}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        );
    };

    // Stats calculation
    const stats = {
        total: studentList.length,
        totalDivA: studentList.filter(s => s.division === 'A').length,
        totalDivB: studentList.filter(s => s.division === 'B').length,
        totalDivC: studentList.filter(s => s.division === 'C').length,
        eligible: studentList.filter(s => s.eligibility).length,
    };

    const downloadSampleCSV = () => {
        const headers = ["GR No", "Username", "Password", "Department", "Class", "Division", "Batch"];
        const sampleData = ["SE2025001,john_doe,password123,Computer,SE,A,B"];

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + sampleData.join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "student_upload_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="student-registration">
            <h2 className="page-title">Student Registration</h2>

            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            {/* Stats Dashboard */}
            <div className="stats-dashboard" style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div className="stat-card" style={{ flex: 1, padding: '15px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #4a90e2' }}>
                    <h4 style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>Total Students</h4>
                    <p style={{ margin: '5px 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total}</p>
                </div>
                <div className="stat-card" style={{ flex: 1, padding: '15px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #28a745' }}>
                    <h4 style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>Eligible</h4>
                    <p style={{ margin: '5px 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.eligible}</p>
                </div>
                <div className="stat-card" style={{ flex: 1, padding: '15px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #fd7e14' }}>
                    <h4 style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>Division A</h4>
                    <p style={{ margin: '5px 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalDivA}</p>
                </div>
                <div className="stat-card" style={{ flex: 1, padding: '15px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #fd7e14' }}>
                    <h4 style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>Division B</h4>
                    <p style={{ margin: '5px 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalDivB}</p>
                </div>
                <div className="stat-card" style={{ flex: 1, padding: '15px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderLeft: '4px solid #fd7e14' }}>
                    <h4 style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>Division C</h4>
                    <p style={{ margin: '5px 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalDivC}</p>
                </div>
            </div>

            {/* Bulk Upload Section */}
            {!editingId && (
                <div className="bulk-upload-section" style={{ marginBottom: '20px', padding: '15px', border: '1px dashed #ccc', borderRadius: '8px', textAlign: 'center', backgroundColor: '#f9f9f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ margin: '0' }}>Bulk Upload via CSV</h4>
                        <button
                            onClick={downloadSampleCSV}
                            className="btn btn-sm btn-outline-primary"
                            style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                        >
                            Download Template
                        </button>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                        Format: GR No, Username, Password, Department, Class, Division, Practical Batch
                    </p>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        style={{ display: 'inline-block' }}
                    />
                </div>
            )}

            <div className="card">
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="grNo" className="form-label">Gr No</label>
                            <input type="text" id="grNo" name="grNo" className="form-input" placeholder="Gr No." value={formData.grNo} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="username" className="form-label">Username</label>
                            <input type="text" id="username" name="username" className="form-input" placeholder="Username" value={formData.username} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input type="password" id="password" name="password" className="form-input" placeholder="Password" value={formData.password} onChange={handleChange} required={!editingId} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="department" className="form-label">Department</label>
                            <input type="text" id="department" name="department" className="form-input" value={formData.department} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="class" className="form-label">Class</label>
                            <select id="class" name="class" className="form-select" value={formData.class} onChange={handleChange} required>
                                <option value="SE">SE</option><option value="TE">TE</option><option value="BE">BE</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="division" className="form-label">Division</label>
                            <select id="division" name="division" className="form-select" value={formData.division} onChange={handleChange} required>
                                {divisions.map(div => <option key={div} value={div}>{div}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="practicalBatch" className="form-label">Practical Batch</label>
                            <select id="practicalBatch" name="practicalBatch" className="form-select" value={formData.practicalBatch} onChange={handleChange} required>
                                <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="eligibility" className="form-label">Eligibility</label>
                            <select id="eligibility" name="eligibility" className="form-select" value={formData.eligibility} onChange={(e) => setFormData({ ...formData, eligibility: e.target.value === 'true' })} required>
                                <option value="true">Yes</option><option value="false">No</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="electiveChosen" className="form-label">Elective Chosen</label>
                        <select
                            id="electiveChosen"
                            name="electiveChosen"
                            className="form-select"
                            value={formData.electiveChosen}
                            onChange={handleChange}
                        >
                            <option value="">Select Elective (Optional)</option>
                            {electives.map((subject, index) => (
                                <option key={index} value={subject}>{subject}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={resetForm}>{editingId ? 'Cancel' : 'Reset'}</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Processing...' : (editingId ? 'Update Student' : 'Submit')}</button>
                    </div>
                </form>
            </div>

            {/* Student List Section */}
            <div className="student-list-section" style={{ marginTop: '2rem' }}>
                <div className="tabs">
                    {classes.map(cls => (
                        <button key={cls} className={`tab-btn ${activeTab === cls ? 'active' : ''}`} onClick={() => setActiveTab(cls)}>{cls}</button>
                    ))}
                </div>

                <div className="list-controls">
                    <div className="filter-group">
                        <input type="text" placeholder="Search by GR No or Username..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        <label>Division:</label>
                        <select value={filterDivision} onChange={(e) => setFilterDivision(e.target.value)} className="filter-select">
                            <option value="All">All</option>
                            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <label>Batch:</label>
                        <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} className="filter-select">
                            <option value="All">All</option>
                            {batches.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                </div>

                {/* Main Action Toolbar */}
                <div className="action-toolbar">
                    <span className="selection-count">
                        {selectedStudentIds.length > 0
                            ? `${selectedStudentIds.length} Selected`
                            : 'Select students'}
                    </span>

                    <div className="toolbar-buttons">
                        <button
                            className="btn btn-sm btn-warning"
                            disabled={selectedStudentIds.length !== 1}
                            onClick={() => handleBulkAction('edit')}
                            title={selectedStudentIds.length !== 1 ? "Select exactly one student to edit" : "Edit Student"}
                        >
                            <FaEdit /> <span className="btn-text">Edit</span>
                        </button>
                        <button
                            className="btn btn-sm btn-primary"
                            disabled={selectedStudentIds.length === 0}
                            onClick={() => handleBulkAction('toggleEligibility')}
                            title="Toggle Eligibility"
                        >
                            <FaCheckCircle /> <span className="btn-text">Toggle Eligibility</span>
                        </button>
                        <button
                            className="btn btn-sm btn-info"
                            disabled={selectedStudentIds.length === 0}
                            onClick={() => handleBulkAction('resetPassword')}
                            style={{ color: '#fff' }}
                            title="Reset Password"
                        >
                            <FaKey /> <span className="btn-text">Reset Pwd</span>
                        </button>
                        <button
                            className="btn btn-sm btn-secondary"
                            disabled={selectedStudentIds.length === 0}
                            onClick={() => handleBulkAction('resetFeedback')}
                            title="Reset Feedback"
                        >
                            <FaUndo /> <span className="btn-text">Reset Feedback</span>
                        </button>
                        <button
                            className="btn btn-sm btn-danger"
                            disabled={selectedStudentIds.length === 0}
                            onClick={() => handleBulkAction('delete')}
                            title="Delete Student"
                        >
                            <FaTrash /> <span className="btn-text">Delete</span>
                        </button>
                    </div>
                </div>

                <div className="faculty-content">
                    <div className="section-header">
                        <h3>{activeTab} Students List</h3>
                        <span className="badge badge-primary">
                            {studentList.filter(student => {
                                const matchesDivision = filterDivision === 'All' || student.division === filterDivision;
                                const matchesBatch = filterBatch === 'All' || student.practicalBatch === filterBatch;
                                const matchesSearch = (student.grNo && student.grNo.toLowerCase().includes(searchQuery.toLowerCase())) || (student.username && student.username.toLowerCase().includes(searchQuery.toLowerCase()));
                                return matchesDivision && matchesBatch && matchesSearch;
                            }).length} Students
                        </span>
                    </div>
                    <div className="table-container">
                        {renderStudentTable()}
                    </div>
                </div>
            </div >
        </div >
    );
};

export default StudentRegistration;
