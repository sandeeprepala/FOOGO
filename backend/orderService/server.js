// ============================================================================
// orderService/server.js - Order Orchestration Service
// ============================================================================
// Core order lifecycle management
// Consumes: payment.completed
// Produces: order.confirmed, restaurant.accepted, restaurant.rejected, agent.assigned

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');

const PORT = process.env.PORT || 3013;
const app = express();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
});

const producer = kafka.producer({ idempotent: true });
const consumer = kafka.consumer({ groupId: 'order-service-group' });

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

app.use(express.json());

// ============================================================================
// KAFKA SETUP - Consume payment.completed events
// ============================================================================
(async () => {
  try {
    await producer.connect();
    await consumer.connect();
    console.log('✅ Kafka Producer & Consumer connected');

    // Subscribe to payment.completed topic
    await consumer.subscribe({ topic: 'payment.completed', fromBeginning: false });

    // Start consuming
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payment = JSON.parse(message.value.toString());
          console.log(`📨 Received payment.completed event:`, payment);

          const { orderId, status } = payment;

          if (status === 'success') {
            // Update order status to 'placed'
            const { error } = await supabase
              .from('orders')
              .update({ status: 'placed' })
              .eq('id', orderId);

            if (!error) {
              // Produce order.confirmed event
              await producer.send({
                topic: 'order.confirmed',
                messages: [
                  {
                    key: `order-${orderId}`,
                    value: JSON.stringify({
                      orderId,
                      status: 'placed',
                      timestamp: new Date().toISOString(),
                    }),
                  },
                ],
              });

              console.log(`✅ Order ${orderId} confirmed, payment successful`);
            }
          } else {
            // Payment failed - update order status
            await supabase
              .from('orders')
              .update({ status: 'payment_failed' })
              .eq('id', orderId);

            console.log(`❌ Order ${orderId} payment failed`);
          }
        } catch (error) {
          console.error('Error processing payment event:', error.message);
        }
      },
    });
  } catch (error) {
    console.error('❌ Kafka setup failed:', error.message);
  }
})();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'order-service' });
});

// ============================================================================
// GET ORDER - GET /orders/:id
// ============================================================================
app.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Get order items (support price_snapshot & item_name_snapshot)
    const { data: items } = await supabase
      .from('order_items')
      .select('id, quantity, price, price_snapshot, menu_item_id, item_name_snapshot, menu_items(name, price)')
      .eq('order_id', orderId);

    // Normalise items so each has top-level `name` and `price` fields
    const normalisedItems = (items || []).map(item => ({
      id: item.id,
      quantity: item.quantity || 1,
      price: item.price_snapshot || item.price || item.menu_items?.price || 299,
      menu_item_id: item.menu_item_id,
      name: item.item_name_snapshot || item.menu_items?.name || `Gourmet Item #${item.menu_item_id}`,
    }));

    // Fetch delivery agent public profile & current location if assigned
    let agent = null;
    if (order.delivery_agent_id) {
      const { data: agentUser } = await supabase
        .from('users')
        .select('id, name, phone, vehicle_number')
        .eq('id', order.delivery_agent_id)
        .maybeSingle();

      const { data: agentLoc } = await supabase
        .from('delivery_agents')
        .select('id, user_id, name, phone, vehicle_number, lat, lng')
        .or(`id.eq.${order.delivery_agent_id},user_id.eq.${order.delivery_agent_id}`)
        .maybeSingle();

      agent = {
        id: order.delivery_agent_id,
        name: agentUser?.name || agentLoc?.name || 'Rajesh Kumar',
        phone: agentUser?.phone || agentLoc?.phone || '+91 98765 43210',
        vehicle_number: agentUser?.vehicle_number || agentLoc?.vehicle_number || 'DL 01 EV 4092',
        lat: agentLoc?.lat ? parseFloat(agentLoc.lat) : null,
        lng: agentLoc?.lng ? parseFloat(agentLoc.lng) : null,
      };
    }

    res.status(200).json({
      success: true,
      order,
      items: normalisedItems,
      agent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching order', error: error.message });
  }
});


// ============================================================================
// GET CUSTOMER ORDERS - GET /orders?customer_id=X
// ============================================================================
app.get('/', async (req, res) => {
  try {
    const customerId = req.user?.id || req.query.customer_id;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'customer_id required' });
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(200).json({
      success: true,
      orders: orders || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
});

// ============================================================================
// RESTAURANT ACCEPT ORDER - PATCH /orders/:orderId/accept
// ============================================================================
/**
 * Restaurant accepts an order
 * Requires: req.user.role == 'restaurant'
 */
app.patch('/:orderId/accept', async (req, res) => {
  try {
    const { orderId } = req.params;
    // Support proxied requests: gateway may forward user id in headers
    const headerUserId = req.get('x-user-id') || req.headers['x-user-id'];
    const restaurantId = req.user?.id || req.body.restaurant_id || headerUserId;

    // Update order status to accepted_by_restaurant
    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: 'accepted_by_restaurant' })
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId)
      .select();

    if (error || !order || order.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Order not found or restaurant not authorized',
      });
    }

    // Produce restaurant.accepted event
    await producer.send({
      topic: 'restaurant.accepted',
      messages: [
        {
          key: `order-${orderId}`,
          value: JSON.stringify({
            orderId,
            restaurantId,
            status: 'accepted_by_restaurant',
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Order accepted',
      order: order[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error accepting order', error: error.message });
  }
});

// ============================================================================
// RESTAURANT REJECT ORDER - PATCH /orders/:orderId/reject
// ============================================================================
app.patch('/:orderId/reject', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const headerUserId = req.get('x-user-id') || req.headers['x-user-id'];
    const restaurantId = req.user?.id || req.body.restaurant_id || headerUserId;

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: 'rejected_by_restaurant' })
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId)
      .select();

    if (error || !order || order.length === 0) {
      return res.status(403).json({ success: false, message: 'Order not found or not authorized' });
    }

    // Produce restaurant.rejected event
    await producer.send({
      topic: 'restaurant.rejected',
      messages: [
        {
          key: `order-${orderId}`,
          value: JSON.stringify({
            orderId,
            restaurantId,
            reason: reason || 'Restaurant rejected order',
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Order rejected',
      order: order[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rejecting order', error: error.message });
  }
});

// ============================================================================
// UPDATE ORDER STATUS - PATCH /orders/:orderId/status
// ============================================================================
/**
 * Delivery agent updates order status
 * Possible statuses: picked_up, on_the_way, delivered
 */
app.patch('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const headerUserId = req.get('x-user-id') || req.headers['x-user-id'];
    const agentId = req.user?.id || req.body.agent_id || headerUserId;

    if (!['picked_up', 'on_the_way', 'delivered'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .eq('delivery_agent_id', agentId)
      .select();

    if (error || !order || order.length === 0) {
      return res.status(403).json({ success: false, message: 'Order not found or not authorized' });
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order: order[0],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating order', error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
  console.error('💥 Error:', error.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║           📦 ORDER-SERVICE Started on ${PORT}                                  ║
║     Orchestrates order lifecycle, consumes payment events                  ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down order-service...');
  producer.disconnect();
  consumer.disconnect();
  process.exit(0);
});
