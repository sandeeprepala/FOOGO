import { apiRequest } from '../api/apiClient';

export const authService = {
  async register(role, userData) {
    return apiRequest(`/auth/register/${role}`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async login(role, credentials) {
    const payload = { role, ...credentials };
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout request warning:', e);
    } finally {
      localStorage.removeItem('foogo_token');
      localStorage.removeItem('foogo_refresh_token');
      localStorage.removeItem('foogo_user');
    }
  }
};
