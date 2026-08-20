import { apiRequest } from '../api/apiClient';

export const restaurantService = {
  async getNearby(lat, lng, radius = 10) {
    return apiRequest(`/restaurants/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
  },

  async getDetails(id) {
    return apiRequest(`/restaurants/${id}`);
  },

  async getMenu(restaurantId) {
    return apiRequest(`/restaurants/${restaurantId}/menu`);
  },

  async addMenuItem(restaurantId, itemData) {
    return apiRequest(`/restaurants/${restaurantId}/menu`, {
      method: 'POST',
      body: JSON.stringify(itemData)
    });
  },

  async updateMenuItem(restaurantId, itemId, itemData) {
    return apiRequest(`/restaurants/${restaurantId}/menu/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(itemData)
    });
  },

  async deleteMenuItem(restaurantId, itemId) {
    return apiRequest(`/restaurants/${restaurantId}/menu/${itemId}`, {
      method: 'DELETE'
    });
  },

  async toggleOpenStatus(restaurantId, isOpen) {
    return apiRequest(`/restaurants/${restaurantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_open: isOpen })
    });
  }
};
