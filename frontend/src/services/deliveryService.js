import { apiRequest } from '../api/apiClient';

export const deliveryService = {
  async updateLocation(agentId, lat, lng, orderId) {
    return apiRequest('/location/update', {
      method: 'POST',
      body: JSON.stringify({
        agent_id: agentId,
        lat,
        lng,
        order_id: orderId
      })
    });
  },

  async getLocation(agentId) {
    return apiRequest(`/location/${agentId}`);
  },

  async markPickedUp(orderId, agentId) {
    return apiRequest(`/delivery/${orderId}/picked-up`, {
      method: 'PATCH',
      body: JSON.stringify({ agent_id: agentId })
    });
  },

  async markOnTheWay(orderId, agentId) {
    return apiRequest(`/delivery/${orderId}/on-the-way`, {
      method: 'PATCH',
      body: JSON.stringify({ agent_id: agentId })
    });
  },

  async markDelivered(orderId, agentId) {
    return apiRequest(`/delivery/${orderId}/delivered`, {
      method: 'PATCH',
      body: JSON.stringify({ agent_id: agentId })
    });
  },

  async getActiveDeliveries(agentId) {
    return apiRequest(`/delivery/agent/${agentId}/active`);
  },

  async getAvailableOrders(lat, lng, radius = 5) {
    return apiRequest(`/delivery/available?lat=${lat}&lng=${lng}&radius=${radius}`);
  },

  async acceptOrder(orderId, agentId) {
    return apiRequest(`/delivery/${orderId}/accept`, {
      method: 'PATCH',
      body: JSON.stringify({ agent_id: agentId })
    });
  }
};
