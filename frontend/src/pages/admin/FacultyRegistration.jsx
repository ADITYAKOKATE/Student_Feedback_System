import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './FacultyRegistration.css';

const FacultyRegistration = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        facultyName: '',
        department: user?.department !== 'All' ? user.department : 'Computer - AIML',
        subjectName: '',
        class: 'SE',
        division: 'A',
        isElective: false,
        isPracticalFaculty: false,
        practicalBatches: [],
    });

    const [activeTab, setActiveTab] = useState('SE');
    const [filterDivision, setFilterDivision] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [facultyList, setFacultyList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const classes = ['SE', 'TE', 'BE'];
    const divisions = ['None', 'A', 'B', 'C'];

    useEffect(() => {
        fetchFaculty();
    }, [activeTab]);

    const fetchFaculty = async () => {
        setFetching(true);
        try {
            // Fetch faculty for the current active class tab
            const response = await api.get('/faculty', {
                params: { class: activeTab }
            });

            if (response.data.success) {
                setFacultyList(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching faculty:', error);
        } finally {
            setFetching(false);
        }
    };

    const [editingId, setEditingId] = useState(null);

    const resetForm = () => {
        setFormData({
            facultyName: '',
            department: user?.department !== 'All' ? user.department : 'Computer - AIML',
            subjectName: '',
            class: 'SE',
            division: 'None',
            isElective: false,
            isPracticalFaculty: false,
            practicalBatches: [],
        });
        setEditingId(null);
        setMessage({ type: '', text: '' });
    };

    const handleEdit = (faculty) => {
        setFormData({
            facultyName: faculty.facultyName,
            department: faculty.department,
            subjectName: faculty.subjectName,
            class: faculty.class,
            division: faculty.division,
            isElective: faculty.isElective,
            isPracticalFaculty: faculty.isPracticalFaculty,
            practicalBatches: faculty.practicalBatches || [],
        });
        setEditingId(faculty._id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setMessage({ type: 'info', text: 'Editing faculty details. Click Update to save.' });
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleBatchChange = (batch) => {
        setFormData(prev => {
            const currentBatches = prev.practicalBatches || [];
            if (currentBatches.includes(batch)) {
                return { ...prev, practicalBatches: currentBatches.filter(b => b !== batch) };
            } else {
                return { ...prev, practicalBatches: [...currentBatches, batch].sort() };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            let response;
            if (editingId) {
                response = await api.put(`/faculty/${editingId}`, formData);
            } else {
                response = await api.post('/faculty/register', formData);
            }

            if (response.data.success) {
                setMessage({
                    type: 'success',
                    text: editingId ? 'Faculty updated successfully!' : 'Faculty registered successfully!'
                });

                const savedClass = formData.class;
                resetForm();

                // Refresh list if the registered/updated faculty belongs to the currently viewed class
                if (savedClass === activeTab) {
                    fetchFaculty();
                } else if (!editingId) {
                    // Switch to the class tab where we just added the faculty (only for new registration)
                    setActiveTab(savedClass);
                } else {
                    // If updated and moved to another class, refresh valid tab
                    fetchFaculty();
                }
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || `Error ${editingId ? 'updating' : 'registering'} faculty`,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this faculty?')) {
            return;
        }

        try {
            const response = await api.delete(`/faculty/${id}`);
            if (response.data.success) {
                setMessage({ type: 'success', text: 'Faculty deleted successfully!' });
                fetchFaculty();
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || 'Error deleting faculty',
            });
        }
    };



    // Filter faculty by division for display
    const getFacultyByDivision = (div) => {
        return facultyList.filter(f => f.division === div);
    };

    return (
        <div className="faculty-registration">
            <h2 className="page-title">Faculty Registration</h2>

            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}



            <div className="card">
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
                                value={formData.department}
                                onChange={handleChange}
                                required
                                disabled={user?.department !== 'All'}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="facultyName" className="form-label">
                                Faculty Name
                            </label>
                            <input
                                type="text"
                                id="facultyName"
                                name="facultyName"
                                className="form-input"
                                placeholder="Faculty Name"
                                value={formData.facultyName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="subjectName" className="form-label">
                                Subject Name
                            </label>
                            <input
                                type="text"
                                id="subjectName"
                                name="subjectName"
                                className="form-input"
                                placeholder="Subject Name"
                                value={formData.subjectName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <input
                                    type="checkbox"
                                    name="isElective"
                                    className="form-checkbox"
                                    checked={formData.isElective}
                                    onChange={handleChange}
                                />
                                Is Elective
                            </label>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="class" className="form-label">
                                Class
                            </label>
                            <select
                                id="class"
                                name="class"
                                className="form-select"
                                value={formData.class}
                                onChange={handleChange}
                                required
                            >
                                {classes.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="division" className="form-label">
                                Division
                            </label>
                            <select
                                id="division"
                                name="division"
                                className="form-select"
                                value={formData.division}
                                onChange={handleChange}
                                required
                            >
                                {divisions.map(d => (
                                    <option key={d} value={d}>Division {d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Practical Faculty</label>
                        <div className="radio-group">
                            <label>
                                <input
                                    type="radio"
                                    name="isPracticalFaculty"
                                    value="true"
                                    checked={formData.isPracticalFaculty === true}
                                    onChange={() =>
                                        setFormData({ ...formData, isPracticalFaculty: true })
                                    }
                                />
                                Yes
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="isPracticalFaculty"
                                    value="false"
                                    checked={formData.isPracticalFaculty === false}
                                    onChange={() =>
                                        setFormData({ ...formData, isPracticalFaculty: false })
                                    }
                                />
                                No
                            </label>
                        </div>
                    </div>

                    {formData.isPracticalFaculty && (
                        <div className="form-group" style={{ marginTop: '15px' }}>
                            <label className="form-label">Practical Batches</label>
                            <div className="checkbox-group" style={{ display: 'flex', gap: '15px' }}>
                                {['A', 'B', 'C'].map(batch => (
                                    <label key={batch} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.practicalBatches?.includes(batch)}
                                            onChange={() => handleBatchChange(batch)}
                                        />
                                        Batch {batch}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={resetForm}
                        >
                            {editingId ? 'Cancel' : 'Reset'}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Processing...' : (editingId ? 'Update Faculty' : 'Submit')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Tab Navigation */}
            <div className="tabs">
                {classes.map(cls => (
                    <button
                        key={cls}
                        className={`tab-btn ${activeTab === cls ? 'active' : ''}`}
                        onClick={() => setActiveTab(cls)}
                    >
                        {cls}
                    </button>
                ))}
            </div>

            {/* Divisions List */}
            {fetching ? (
                <div className="text-center p-4">Loading...</div>
            ) : (
                <div className="faculty-content">
                    <div className="list-controls">
                        <div className="filter-group">
                            <input
                                type="text"
                                placeholder="Search by name or subject..."
                                className="search-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <label>Filter by Division:</label>
                            <select
                                value={filterDivision}
                                onChange={(e) => setFilterDivision(e.target.value)}
                                className="filter-select"
                            >
                                <option value="All">All Divisions</option>
                                <option value="None">None</option>
                                <option value="A">Division A</option>
                                <option value="B">Division B</option>
                                <option value="C">Division C</option>
                            </select>
                        </div>
                        <div className="list-summary">
                            Showing {facultyList.filter(f => {
                                const matchesDivision = filterDivision === 'All' || f.division === filterDivision;
                                const name = f.facultyName || '';
                                const subject = f.subjectName || '';
                                const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    subject.toLowerCase().includes(searchQuery.toLowerCase());
                                return matchesDivision && matchesSearch;
                            }).length} faculty members
                        </div>
                    </div>

                    <div className="faculty-section">
                        <div className="section-header">
                            <h3>{activeTab} Faculty List</h3>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Faculty Name</th>
                                        <th>Subject</th>
                                        <th>Division</th>
                                        <th>Practical</th>
                                        <th>Batch</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {facultyList
                                        .filter(f => {
                                            const matchesDivision = filterDivision === 'All' || f.division === filterDivision;
                                            const name = f.facultyName || '';
                                            const subject = f.subjectName || '';
                                            const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                subject.toLowerCase().includes(searchQuery.toLowerCase());
                                            return matchesDivision && matchesSearch;
                                        })
                                        .sort((a, b) => {
                                            // Sort by Division then Name
                                            if (a.division < b.division) return -1;
                                            if (a.division > b.division) return 1;
                                            return a.facultyName.localeCompare(b.facultyName);
                                        })
                                        .length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center">
                                                No faculty found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        facultyList
                                            .filter(f => {
                                                const matchesDivision = filterDivision === 'All' || f.division === filterDivision;
                                                const name = f.facultyName || '';
                                                const subject = f.subjectName || '';
                                                const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    subject.toLowerCase().includes(searchQuery.toLowerCase());
                                                return matchesDivision && matchesSearch;
                                            })
                                            .sort((a, b) => {
                                                if (a.division < b.division) return -1;
                                                if (a.division > b.division) return 1;
                                                return a.facultyName.localeCompare(b.facultyName);
                                            })
                                            .flatMap((faculty) => {
                                                if (faculty.isPracticalFaculty && faculty.practicalBatches && faculty.practicalBatches.length > 0) {
                                                    return faculty.practicalBatches.map((batch, index) => ({
                                                        ...faculty,
                                                        displayBatch: batch,
                                                        uniqueKey: `${faculty._id}-${batch}`
                                                    }));
                                                }
                                                return [{
                                                    ...faculty,
                                                    displayBatch: '-',
                                                    uniqueKey: faculty._id
                                                }];
                                            })
                                            .map((row) => (
                                                <tr key={row.uniqueKey}>
                                                    <td>{row.facultyName}</td>
                                                    <td>{row.subjectName}</td>
                                                    <td>
                                                        <span className={`badge badge-${row.division === 'None' ? 'secondary' : 'primary'}`}>
                                                            {row.division}
                                                        </span>
                                                    </td>
                                                    <td>{row.isPracticalFaculty ? 'Yes' : 'No'}</td>
                                                    <td>{row.displayBatch}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-warning btn-sm"
                                                            style={{ marginRight: '5px' }}
                                                            onClick={() => handleEdit(row)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => handleDelete(row._id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyRegistration;
