import { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkSession = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            if (user) {
                logout();
            }
            return null;
        }

        try {
            const response = await api.get('/auth/me');
            const userData = response.data.user;
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            return userData;
        } catch (error) {
            console.error('Session verification failed:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
                toast.error('Session expired or access revoked');
            }
            return null;
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                setUser(JSON.parse(savedUser));
                await checkSession();
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user: userData } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            toast.success('Login successful!');
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
            return false;
        }
    };

    const register = async (name, email, password, role = 'employee') => {
        try {
            const response = await api.post('/auth/register', { name, email, password, role });

            // Check if user requires approval
            if (response.data.requiresApproval) {
                // Don't set token or user - they need approval first
                return true;
            }

            // Legacy path (shouldn't happen with new system)
            const { token, user: userData } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        toast.success('Logged out successfully');
    };

    const updateUser = (updatedUserData) => {
        const newUser = { ...user, ...updatedUserData };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    // Apply the per-account theme whenever the resolved user changes (login,
    // /auth/me re-check, Preferences save). The stored value on the server is
    // the single source of truth — navbar ThemeSwitcher and the Settings grid
    // both write it, and this effect re-applies it on any device after login.
    // Signed out → back to the light default. The inline script in index.html
    // covers the pre-React paint; this covers every later change.
    useEffect(() => {
        const theme = user?.preferences?.theme || 'light';
        document.documentElement.setAttribute('data-theme', theme);
    }, [user?.preferences?.theme, user]);

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        checkSession,
        isAdmin: user?.role === 'admin',
        isEmployee: user?.role === 'employee',
        isIntern: user?.role === 'intern'
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
