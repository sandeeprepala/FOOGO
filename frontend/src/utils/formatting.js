/**
 * Format currency in INR format (₹)
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

/**
 * Format distance in km
 */
export const formatDistance = (distKm) => {
  if (!distKm || isNaN(distKm)) return '2.5 km';
  return `${Number(distKm).toFixed(1)} km`;
};

/**
 * Format relative date time
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Format raw order status into clean human text
 */
export const formatStatusText = (status) => {
  switch (status) {
    case 'pending_payment': return 'Processing Payment';
    case 'placed': return 'Order Placed';
    case 'accepted_by_restaurant': return 'Accepted by Restaurant';
    case 'agent_assigned': return 'Delivery Agent Assigned';
    case 'rejected_by_restaurant': return 'Order Cancelled/Rejected';
    case 'preparing': return 'Preparing Food';
    case 'picked_up': return 'Picked Up by Agent';
    case 'on_the_way': return 'Out for Delivery';
    case 'delivered': return 'Delivered';
    default: return status ? status.replace(/_/g, ' ') : 'Processing';
  }
};

/**
 * Convert any string/mixed ID to a valid Postgres BIGINT integer for database queries
 */
export const toNumericId = (id, fallback = 1) => {
  if (typeof id === 'number' && !isNaN(id)) return id;
  if (!id) return fallback;
  const digitsOnly = String(id).replace(/\D/g, '');
  const parsed = parseInt(digitsOnly, 10);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};
