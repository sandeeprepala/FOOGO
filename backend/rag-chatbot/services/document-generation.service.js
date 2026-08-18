// ============================================================================
// rag-chatbot/services/document-generation.service.js
// ============================================================================
// Converts restaurant and menu_item database records into RAG documents
// Each document is a semantic unit ready for embedding and retrieval
// ============================================================================

/**
 * Generate a RAG document from a restaurant record
 * Document contains: Name, Cuisine, Address, Open Status
 * Excludes: email, password_hash, phone_no
 *
 * @param {Object} restaurant - Database restaurant record
 * @returns {Object} - { content, metadata }
 */
function generateRestaurantDocument(restaurant) {
  if (!restaurant || !restaurant.id) {
    throw new Error('Invalid restaurant record');
  }

  const {
    id,
    name,
    cuisine_type,
    address,
    is_open,
  } = restaurant;

  // Generate human-readable content for embedding
  const content = `Restaurant Name: ${name}
Cuisine: ${cuisine_type || 'Not specified'}
Address: ${address}
Currently Open: ${is_open ? 'Yes' : 'No'}`;

  // Metadata for result construction and filtering
  const metadata = {
    restaurant_id: id,
    restaurant_name: name,
    cuisine_type: cuisine_type || null,
    is_open: is_open,
    address: address,
  };

  return { content, metadata };
}

/**
 * Generate a RAG document from a menu_item + restaurant record
 * Document contains: Food name, Restaurant, Cuisine, Description, Category, Price, Address, Status
 * Excludes: restaurant email, password_hash, phone_no
 *
 * @param {Object} menuItem - Database menu_item record (with joined restaurant data)
 * @param {Object} restaurant - Associated restaurant record
 * @returns {Object} - { content, metadata }
 */
function generateMenuItemDocument(menuItem, restaurant) {
  if (!menuItem || !menuItem.id || !restaurant || !restaurant.id) {
    throw new Error('Invalid menu item or restaurant record');
  }

  const {
    id: menuItemId,
    name: foodName,
    description,
    price,
    category,
    is_available: menuIsAvailable,
  } = menuItem;

  const {
    id: restaurantId,
    name: restaurantName,
    cuisine_type,
    address,
    is_open: restaurantIsOpen,
  } = restaurant;

  // Generate human-readable content for embedding
  const content = `Food: ${foodName}
Restaurant: ${restaurantName}
Cuisine: ${cuisine_type || 'Not specified'}
Description: ${description || 'No description'}
Category: ${category || 'Not specified'}
Price: ₹${price}
Restaurant Address: ${address}
Restaurant Currently Open: ${restaurantIsOpen ? 'Yes' : 'No'}
Food Currently Available: ${menuIsAvailable ? 'Yes' : 'No'}`;

  // Metadata for result construction and filtering
  const metadata = {
    menu_item_id: menuItemId,
    restaurant_id: restaurantId,
    restaurant_name: restaurantName,
    price: parseFloat(price),
    category: category || null,
    is_available: menuIsAvailable,
    is_open: restaurantIsOpen,
    cuisine_type: cuisine_type || null,
  };

  return { content, metadata };
}

module.exports = {
  generateRestaurantDocument,
  generateMenuItemDocument,
};
