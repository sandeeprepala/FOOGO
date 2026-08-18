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
    const agentId = req.user?.id || req.body.agent_id;

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: 'picked_up' })
      .eq('id', orderId)
      .eq('delivery_agent_id', agentId)
      .select();

    if (error || !order || order.length === 0) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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
    const agentId = req.user?.id || req.body.agent_id;

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: 'on_the_way' })
      .eq('id', orderId)
      .eq('delivery_agent_id', agentId)
      .select();

    if (error || !order || order.length === 0) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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
    const agentId = req.user?.id || req.body.agent_id;

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId)
      .eq('delivery_agent_id', agentId)
      .select();

    if (error || !order || order.length === 0) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
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
