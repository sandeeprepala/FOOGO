import { apiRequest } from '../api/apiClient';

export const orderService = {
  async getOrderById(orderId) {
    // Returns { order, items, agent } — agent is null if not yet assigned
    return apiRequest(`/orders/${orderId}`);
  },

  async getCustomerOrders(customerId) {
    const query = customerId ? `?customer_id=${customerId}` : '';
    return apiRequest(`/orders${query}`);
  },

  async restaurantAccept(orderId) {
    return apiRequest(`/orders/${orderId}/accept`, {
      method: 'PATCH'
    });
  },

  async restaurantReject(orderId, reason = 'Kitchen busy') {
    return apiRequest(`/orders/${orderId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
  },

  async updateDeliveryStatus(orderId, status) {
    return apiRequest(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async getRestaurantIncomingOrders(restaurantId) {
    return apiRequest(`/restaurant-orders/restaurant/${restaurantId}/orders`);
  },

  async getRestaurantOrderDetails(orderId) {
    return apiRequest(`/restaurant-orders/orders/${orderId}`);
  }
};
