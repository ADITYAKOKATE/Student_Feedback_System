import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        // If Authorization header is already set (e.g., for Student), don't overwrite
        if (!config.headers.Authorization) {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Handle 401 Unauthorized
            if (error.response.status === 401) {
                // If we are in student section, don't redirect to admin login
                if (window.location.pathname.startsWith('/student')) {
                    // Let the component handle it or redirect to student login
                    // component usually handles it by checking studentToken, 
                    // or we can redirect to /student/login if needed, but let's be careful not to loop
                    if (window.location.pathname !== '/student/login') {
                        window.location.href = '/student/login';
                    }
                } else {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/admin/login';
                }
            }

            // Return error message from server
            return Promise.reject(error.response.data);
        }

        // Network error or no response
        return Promise.reject({
            success: false,
            message: 'Network error. Please check your connection.',
        });
    }
);

export default api;
