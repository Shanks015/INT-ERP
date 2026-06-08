import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, module = null }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && user.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    // Check module permission if user is an intern
    if (module && user.role === 'intern') {
        const allowedModules = user.allowedModules || [];
        if (!allowedModules.includes(module)) {
            // Find first allowed module
            if (allowedModules.length > 0) {
                const targetModule = allowedModules[0];
                return <Navigate to={`/${targetModule}`} replace />;
            } else {
                // No modules allowed, send to my-requests which is not guarded
                return <Navigate to="/my-requests" replace />;
            }
        }
    }

    return children;
};

export default ProtectedRoute;
