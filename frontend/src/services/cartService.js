import { apiRequest } from '../api/apiClient';
import { toNumericId } from '../utils/formatting';

export const cartService = {
  async getCart(customerId) {
    const query = customerId ? `?customer_id=${toNumericId(customerId, 1)}` : '';
    return apiRequest(`/cart${query}`);
  },

  async addToCart(restaurantId, menuItemId, quantity = 1, customerId) {
    const validCustId = customerId ? toNumericId(customerId, 1) : undefined;
    const validRestId = toNumericId(restaurantId, 1);
    const validMenuId = toNumericId(menuItemId, 1);

    const body = {
      restaurant_id: validRestId,
      menu_item_id: validMenuId,
      quantity: parseInt(quantity, 10) || 1
    };

    if (validCustId) body.customer_id = validCustId;

    return apiRequest('/cart/add', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async removeItem(cartItemId, customerId) {
    const validCartItemId = toNumericId(cartItemId, 1);
    const validCustId = customerId ? toNumericId(customerId, 1) : undefined;

    const body = {};
    if (validCustId) body.customer_id = validCustId;

    return apiRequest(`/cart/${validCartItemId}`, {
      method: 'DELETE',
      body: JSON.stringify(body)
    });
  },

  async clearCart(customerId) {
    const validCustId = customerId ? toNumericId(customerId, 1) : undefined;
    const body = {};
    if (validCustId) body.customer_id = validCustId;

    return apiRequest('/cart', {
      method: 'DELETE',
      body: JSON.stringify(body)
    });
  },

  async checkout(deliveryAddress, deliveryLat, deliveryLng, customerId, cartItems = []) {
    const validCustId = customerId ? toNumericId(customerId, 1) : undefined;

    const body = {
      delivery_address: deliveryAddress,
      delivery_lat: deliveryLat ?? 28.6139,
      delivery_lng: deliveryLng ?? 77.2090,
      // Send cart items directly so backend can create order even if DB cart sync failed
      cart_items: cartItems.map(item => ({
        menu_item_id: toNumericId(item.menu_item_id || item.id, 1),
        quantity: item.quantity || 1,
        price_snapshot: item.price_snapshot || item.price || 299,
        item_name_snapshot: item.name || item.item_name || `Item`,
        restaurant_id: toNumericId(item.restaurant_id, 1)
      }))
    };

    if (validCustId) body.customer_id = validCustId;

    return apiRequest('/cart/checkout', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }
};
