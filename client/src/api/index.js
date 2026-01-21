import axios from 'axios';
import toast from 'react-hot-toast';

// Dynamically determine API URL based on current hostname
const getApiUrl = () => {
    // Check if we are in production build (Vite sets this)
    if (import.meta.env.PROD) {
        return '/api'; // Use relative path for Nginx reverse proxy
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // In development or specific environments
    if (hostname.includes('onrender.com') || hostname.includes('railway.app')) {
        return `${protocol}//${hostname}/api`;
    }

    // Default local development
    return `${protocol}//${hostname}:5000/api`;
};

const api = axios.create({
    baseURL: getApiUrl(),
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            // Network error
            toast.error('Network Error. Please check your connection.');
            return Promise.reject(error);
        }

        const { status, data } = error.response;
        const message = data?.message || 'An error occurred';

        switch (status) {
            case 401:
                // Token expired or invalid
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (window.location.pathname !== '/login') {
                    toast.error('Session expired. Please login again.');
                    window.location.href = '/login';
                }
                break;
            case 403:
                toast.error(message || 'You do not have permission to perform this action.');
                break;
            case 404:
                // resource not found - typically handled by component, but sometimes useful to toast
                // toast.error('Resource not found.'); 
                // Commented out to let components handle specific 404s if needed, or uncomment for global
                break;
            case 500:
                toast.error('Server error. Please try again later.');
                break;
            default:
                // For other errors (400, etc), let the component handle it or show generic if really needed.
                // Generally components want to show specific validation errors.
                // Keeping it silent globally for 400s unless we want to force it.
                // But for now, let's toast if it's not a handled case? No, better to let components decide for 400.
                break;
        }

        return Promise.reject(error);
    }
);

export default api;