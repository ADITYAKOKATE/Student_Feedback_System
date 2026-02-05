import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

const ProtectedRoute = ({ children, requireAdmin = false, requireStudent = false }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <Loader fullScreen />;
    }

    if (!user) {
        return <Navigate to="/admin/login" replace />;
    }

    if (requireAdmin && user.role !== 'admin') {
        return <Navigate to="/admin/login" replace />;
    }

    if (requireStudent && user.role !== 'student') {
        return <Navigate to="/student/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
