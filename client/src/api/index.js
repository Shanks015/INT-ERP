import axios from 'axios';

// Dynamically determine API URL based on current hostname
const getApiUrl = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol; // http: or https:

    // In production (Render), don't use port number
    if (hostname.includes('onrender.com') || hostname.includes('railway.app')) {
        return `${protocol}//${hostname}/api`;
    }

    // In development, use port 5000
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
