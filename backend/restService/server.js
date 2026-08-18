// ============================================================================
// restService/server.js - Restaurant Service
// ============================================================================
// Handles restaurant profiles, menu CRUD, and nearby search

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const supabase = require('./db');
const { producer, consumer } = require('./kafka');

const PORT = process.env.PORT || 3011;
const app = express();

app.use(express.json());

// ============================================================================
// KAFKA SETUP
// ============================================================================
(async () => {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected');
  } catch (error) {
    console.error('❌ Kafka Producer connection failed:', error.message);
  }
})();

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'restaurant-service' });
});

// ============================================================================
// GET NEARBY RESTAURANTS - Using Haversine Formula
// ============================================================================
/**
 * GET /restaurants/nearby?lat=28.6139&lng=77.2090&radius=10
 * Returns all open restaurants within radius km using Haversine formula
 */
app.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng query parameters are required',
      });
    }

    // Haversine formula in SQL (no PostGIS needed)
    // Distance in km: 6371 * acos(cos(lat1) * cos(lat2) * cos(lng2 - lng1) + sin(lat1) * sin(lat2))
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, email, phone_no, address, lat, lng, cuisine_type, is_open, created_at')
      .eq('is_open', true)
      .gte(
        'lat',
        parseFloat(lat) - parseFloat(radius) / 111.0 // Rough estimate: 1 degree ≈ 111 km
      )
      .lte(
        'lat',
        parseFloat(lat) + parseFloat(radius) / 111.0
      )
      .gte(
        'lng',
        parseFloat(lng) - parseFloat(radius) / (111.0 * Math.cos(parseFloat(lat) * (Math.PI / 180)))
      )
      .lte(
        'lng',
        parseFloat(lng) + parseFloat(radius) / (111.0 * Math.cos(parseFloat(lat) * (Math.PI / 180)))
      );

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Calculate exact distance for each restaurant and filter
    const restaurants = data
      .map((r) => {
        const R = 6371; // Earth radius in km
        const lat1 = parseFloat(lat) * (Math.PI / 180);
        const lat2 = r.lat * (Math.PI / 180);
        const dlat = (r.lat - parseFloat(lat)) * (Math.PI / 180);
        const dlng = (r.lng - parseFloat(lng)) * (Math.PI / 180);

        const a =
          Math.sin(dlat / 2) * Math.sin(dlat / 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2) * Math.sin(dlng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return { ...r, distance_km: parseFloat(distance.toFixed(2)) };
      })
      .filter((r) => r.distance_km <= parseFloat(radius))
      .sort((a, b) => a.distance_km - b.distance_km);

    res.status(200).json({
      success: true,
      count: restaurants.length,
      restaurants,
    });
  } catch (error) {
    console.error('Nearby search error:', error.message);
    res.status(500).json({ success: false, message: 'Search failed', error: error.message });
  }
});

// ============================================================================
// GET RESTAURANT DETAILS
// ============================================================================
/**
 * GET /restaurants/:id
 */
app.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    res.status(200).json({ success: true, restaurant: data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching restaurant', error: error.message });
  }
});

// ============================================================================
// GET RESTAURANT MENU
// ============================================================================
/**
 * GET /restaurants/:id/menu
 */
app.get('/:restaurantId/menu', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(200).json({ success: true, menu_items: data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching menu', error: error.message });
  }
});

// ============================================================================
// ADD MENU ITEM
// ============================================================================
/**
 * POST /restaurants/:restaurantId/menu
 * Body: { name, description, price, category }
 * Requires: req.user.id == restaurantId (verified by gateway)
 */
app.post('/:restaurantId/menu', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { name, description, price, category } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'name and price are required',
      });
    }

    const { data, error } = await supabase
      .from('menu_items')
      .insert([
        {
          restaurant_id: restaurantId,
          name,
          description,
          price: parseFloat(price),
          category,
          is_available: true,
        },
      ])
      .select();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(201).json({
      success: true,
      message: 'Menu item added',
      menu_item: data[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding menu item', error: error.message });
  }
});

// ============================================================================
// UPDATE MENU ITEM
// ============================================================================
/**
 * PATCH /restaurants/:restaurantId/menu/:itemId
 */
app.patch('/:restaurantId/menu/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, description, price, category, is_available } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category !== undefined) updateData.category = category;
    if (is_available !== undefined) updateData.is_available = is_available;

    const { data, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', itemId)
      .select();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(200).json({
      success: true,
      message: 'Menu item updated',
      menu_item: data[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating menu item', error: error.message });
  }
});

// ============================================================================
// DELETE MENU ITEM
// ============================================================================
/**
 * DELETE /restaurants/:restaurantId/menu/:itemId
 */
app.delete('/:restaurantId/menu/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(200).json({
      success: true,
      message: 'Menu item deleted',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting menu item', error: error.message });
  }
});

// ============================================================================
// UPDATE RESTAURANT STATUS (open/close)
// ============================================================================
/**
 * PATCH /restaurants/:id/status
 * Body: { is_open: boolean }
 */
app.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_open } = req.body;

    if (is_open === undefined) {
      return res.status(400).json({
        success: false,
        message: 'is_open is required',
      });
    }

    const { data, error } = await supabase
      .from('restaurants')
      .update({ is_open })
      .eq('id', id)
      .select();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(200).json({
      success: true,
      message: `Restaurant ${is_open ? 'opened' : 'closed'}`,
      restaurant: data[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating restaurant status', error: error.message });
  }
});

// ============================================================================
// 404 & ERROR HANDLING
// ============================================================================

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
  console.error('💥 Error:', error.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║            🍽️  RESTAURANT-SERVICE Started on ${PORT}                            ║
║                 Handles: Restaurant profiles, menus, search                ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down restaurant-service...');
  producer.disconnect();
  process.exit(0);
});
