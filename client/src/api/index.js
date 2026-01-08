import axios from 'axios';

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
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;