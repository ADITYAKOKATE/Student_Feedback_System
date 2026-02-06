import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import FacultyRegistration from './pages/admin/FacultyRegistration';
import StudentRegistration from './pages/admin/StudentRegistration';
import TheoryFeedbackRetrieval from './pages/admin/TheoryFeedbackRetrieval';
import PracticalFeedbackRetrieval from './pages/admin/PracticalFeedbackRetrieval';
import FacilitiesFeedbackRetrieval from './pages/admin/FacilitiesFeedbackRetrieval';
import StudentLogin from './pages/student/StudentLogin';
import FeedbackWizard from './pages/student/FeedbackWizard';
import Reports from './pages/admin/Reports';
import { useEffect } from 'react';

const TitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      document.title = 'Admin Portal';
    } else if (location.pathname.startsWith('/student')) {
      document.title = 'Student Feedback Form';
    } else {
      document.title = 'Student Feedback System';
    }
  }, [location]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <TitleUpdater />
        <Routes>
          {/* Redirect root to admin login */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />

          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/faculty-registration" replace />} />
            <Route path="faculty-registration" element={<FacultyRegistration />} />
            <Route path="student-registration" element={<StudentRegistration />} />
            <Route path="theory-feedback" element={<TheoryFeedbackRetrieval />} />
            <Route path="practical-feedback" element={<PracticalFeedbackRetrieval />} />
            <Route path="facilities-feedback" element={<FacilitiesFeedbackRetrieval />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Student Routes */}
          <Route path="/student/login" element={<StudentLogin />} />
          <Route
            path="/student/feedback"
            element={
              <ProtectedRoute>
                <FeedbackWizard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
