import apiClient from '../../../api/apiClient';

const authService = {
  login: async (username, password) => {
    const response = await apiClient.post('/token/', { username, password });
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  },

  refreshToken: async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) throw new Error('No refresh token found');
    
    const response = await apiClient.post('/token/refresh/', { refresh });
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
    }
    return response.data.access;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  }
};

export default authService;
