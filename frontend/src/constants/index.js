export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const SOCKET_URLS = {
  ORDER_TRACKING: (orderId) => import.meta.env.VITE_WS_ORDER_URL || `ws://localhost:3017/orders/${orderId}`,
  AGENT_NOTIF: (agentId) => import.meta.env.VITE_WS_AGENT_URL || `ws://localhost:3016/agent/${agentId}`,
  RESTAURANT_NOTIF: (restaurantId) => import.meta.env.VITE_WS_RESTAURANT_URL || `ws://localhost:3015/restaurant/${restaurantId}`
};

export const ROLES = {
  CUSTOMER: 'customer',
  RESTAURANT: 'restaurant',
  DELIVERY_AGENT: 'delivery_agent'
};

export const ORDER_STATUSES = {
  PENDING_PAYMENT: 'pending_payment',
  PLACED: 'placed',
  ACCEPTED: 'accepted_by_restaurant',
  REJECTED: 'rejected_by_restaurant',
  PREPARING: 'preparing',
  PICKED_UP: 'picked_up',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered'
};

export const ORDER_TIMELINE_STEPS = [
  { key: 'placed', label: 'Order Placed', desc: 'Received & waiting confirmation' },
  { key: 'accepted_by_restaurant', label: 'Accepted', desc: 'Restaurant confirmed your order' },
  { key: 'preparing', label: 'Preparing', desc: 'Chefs are cooking your meal' },
  { key: 'picked_up', label: 'Picked Up', desc: 'Delivery partner collected food' },
  { key: 'on_the_way', label: 'On The Way', desc: 'Heading towards your location' },
  { key: 'delivered', label: 'Delivered', desc: 'Enjoy your meal!' }
];

export const CUISINES = [
  { id: 'all', name: 'All Cuisines', icon: 'Utensils' },
  { id: 'Italian', name: 'Italian & Pizza', icon: 'Pizza' },
  { id: 'Burger', name: 'Burgers & Fast Food', icon: 'Sandwich' },
  { id: 'Indian', name: 'Indian Curries', icon: 'Soup' },
  { id: 'Asian', name: 'Asian & Chinese', icon: 'Flame' },
  { id: 'Healthy', name: 'Healthy & Bowls', icon: 'Salad' },
  { id: 'Desserts', name: 'Desserts & Sweets', icon: 'IceCream' },
  { id: 'Beverages', name: 'Coffee & Drinks', icon: 'Coffee' }
];

export const DEFAULT_CUSTOMER_LOCATION = {
  address: "Green Park, Main Market, New Delhi",
  lat: 28.6139,
  lng: 77.2090
};
