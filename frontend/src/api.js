import axios from 'axios';

const API = axios.create({
    baseURL: 'http://127.0.0.1:8000/api/', 
});

// --- NEW CODE: THE AUTO-BADGE ---
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            // If we have a token, attach it to the Authorization header
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
// --------------------------------

export const loginUser = async (username, password) => {
    try {
        const response = await API.post('login/', {
            username: username,
            password: password
        });

        if (response.data.access) {
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);
            localStorage.setItem('user_role', response.data.role);
            localStorage.setItem('username', response.data.username);
        }
        
        return response.data;
    } catch (error) {
        console.error("Login failed:", error.response?.data || error.message);
        throw error;
    }
};

export default API;