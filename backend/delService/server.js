// ============================================================================
// delService/server.js - Delivery Service
// ============================================================================
// Handles delivery agent status updates: picked_up, on_the_way, delivered

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3018;
const app = express();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'delivery-service' });
});

// ============================================================================
// DELIVERY STATUS ENDPOINTS
// ============================================================================

/**
 * PATCH /delivery/:orderId/picked-up
 * Delivery agent marks order as picked up from restaurant
 */
app.patch('/:orderId/picked-up', async (req, res) => {
  try {
    const { orderId } = req.params;
    const headerUserId = req.get('x-user-id') || req.headers['x-user-id'];
    const agentId = req.user?.id || req.body.agent_id || headerUserId;

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: 'picked_up' })
      .eq('id', orderId)
      .select();

    if (error || !order || order.length === 0) {
      return res.status(403).json({ success: false, message: 'Order not found or update failed' });
    }

    res.status(200).json({
      success: true,
      message: 'Order picked up',
      order: order[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating order', error: error.message });
  }
});

/**
 * PATCH /delivery/:orderId/on-the-way
 * Delivery agent is en route to customer
 */
app.patch('/:orderId/on-the-way', async (req, res) => {
  try {
    const { orderId } = req.params;
    const headerUserId = req.get('x-user-id') || req.headers['x-user-id'];
    const agentId = req.user?.id || req.body.agent_id || headerUserId;

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: 'on_the_way' })
      .eq('id', orderId)
      .select();

    if (error || !order || order.length === 0) {
      return res.status(403).json({ success: false, message: 'Order not found or update failed' });
    }

    res.status(200).json({
      success: true,
      message: 'Order on the way',
      order: order[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating order', error: error.message });
  }
});

/**
 * PATCH /delivery/:orderId/delivered
 * Order delivered to customer
 */
app.patch('/:orderId/delivered', async (req, res) => {
  try {
    const { orderId } = req.params;
    const headerUserId = req.get('x-user-id') || req.headers['x-user-id'];
    const agentId = req.user?.id || req.body.agent_id || headerUserId;

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId)
      .select();

    if (error || !order || order.length === 0) {
      return res.status(403).json({ success: false, message: 'Order not found or update failed' });
    }

    res.status(200).json({
      success: true,
      message: 'Order delivered',
      order: order[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating order', error: error.message });
  }
});

/**
 * GET /delivery/available?lat=28.6139&lng=77.2090&radius=5
 * Fetch unassigned orders (status = 'accepted_by_restaurant') within 5km radius
 */
app.get('/available', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, customer_id, restaurant_id, status, total_amount, delivery_address, delivery_lat, delivery_lng, created_at')
      .eq('status', 'accepted_by_restaurant')
      .is('delivery_agent_id', null);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (!lat || !lng) {
      return res.status(200).json({ success: true, count: orders?.length || 0, orders: orders || [] });
    }

    const toRadians = (deg) => (deg * Math.PI) / 180;
    const haversineKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const agentLat = parseFloat(lat);
    const agentLng = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    const nearbyOrders = (orders || [])
      .map((o) => {
        const oLat = parseFloat(o.delivery_lat) || 28.6139;
        const oLng = parseFloat(o.delivery_lng) || 77.2090;
        const dist = haversineKm(agentLat, agentLng, oLat, oLng);
        return { ...o, distance_km: parseFloat(dist.toFixed(2)) };
      })
      .filter((o) => o.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);

    res.status(200).json({ success: true, count: nearbyOrders.length, orders: nearbyOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching available orders', error: error.message });
  }
});

/**
 * PATCH /delivery/:orderId/accept
 * Agent claims an unassigned order
 */
app.patch('/:orderId/accept', async (req, res) => {
  try {
    const { orderId } = req.params;
    const headerUserId = req.get('x-user-id') || req.headers['x-user-id'];
    const agentId = req.user?.id || req.body.agent_id || headerUserId;

    if (!agentId) {
      return res.status(400).json({ success: false, message: 'agent_id is required' });
    }

    // Atomic update in Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        delivery_agent_id: agentId,
        status: 'agent_assigned'
      })
      .eq('id', orderId)
      .eq('status', 'accepted_by_restaurant')
      .is('delivery_agent_id', null)
      .select();

    if (error || !order || order.length === 0) {
      return res.status(409).json({ success: false, message: 'Order already claimed or not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Order accepted',
      order: order[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error accepting order', error: error.message });
  }
});

/**
 * GET /delivery/agent/:agentId/active
 * Get current active delivery orders for agent
 */
app.get('/agent/:agentId/active', async (req, res) => {
  try {
    const { agentId } = req.params;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, customer_id, status, total_amount, delivery_address, delivery_lat, delivery_lng')
      .eq('delivery_agent_id', agentId)
      .in('status', ['agent_assigned', 'picked_up', 'on_the_way']);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(200).json({ success: true, orders: orders || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║             🚚 DELIVERY-SERVICE Started on ${PORT}                              ║
║          Handles: Delivery agent status updates (picked_up, delivered)     ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down delivery-service...');
  process.exit(0);
});
