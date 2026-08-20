// ============================================================================
// restOrderService/server.js - Restaurant Order Management
// ============================================================================
// Consumes: order.confirmed
// Produces: restaurant.accepted, restaurant.rejected
// Manages WebSocket connections for real-time notifications to restaurants

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const { Kafka } = require('kafkajs');

const PORT = process.env.PORT || 3015;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const kafka = new Kafka({
  clientId: 'rest-order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
});

const producer = kafka.producer({ idempotent: true });
const consumer = kafka.consumer({ groupId: 'rest-order-service-group' });

app.use(express.json());

// Store active WebSocket connections: { restaurantId: Set<ws> }
const restaurantConnections = new Map();

// ============================================================================
// KAFKA SETUP - Consume order.confirmed
// ============================================================================
(async () => {
  try {
    await producer.connect();
    await consumer.connect();
    console.log('✅ Kafka connected');

    await consumer.subscribe({ topic: 'order.confirmed', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const orderData = JSON.parse(message.value.toString());
          console.log(`📨 Received order.confirmed:`, orderData.orderId);

          const { orderId } = orderData;

          // Fetch order details from DB
          const { data: order } = await supabase
            .from('orders')
            .select('id, customer_id, restaurant_id, total_amount, delivery_address')
            .eq('id', orderId)
            .single();

          if (!order) {
            console.error(`Order ${orderId} not found`);
            return;
          }

          // Send WebSocket notification to connected restaurant
          const restaurantClients = restaurantConnections.get(order.restaurant_id);
          if (restaurantClients && restaurantClients.size > 0) {
            const notification = {
              event: 'new_order',
              orderId: order.id,
              customerName: 'Customer', // In real app, fetch customer name
              totalAmount: order.total_amount,
              deliveryAddress: order.delivery_address,
              timestamp: new Date().toISOString(),
            };

            restaurantClients.forEach((ws) => {
              if (ws.readyState === 1) { // OPEN
                ws.send(JSON.stringify(notification));
              }
            });

            console.log(`📲 Sent order ${orderId} to restaurant ${order.restaurant_id} via WebSocket`);
          } else {
            console.log(`No WebSocket connection for restaurant ${order.restaurant_id}`);
          }
        } catch (error) {
          console.error('Error processing order.confirmed:', error.message);
        }
      },
    });
  } catch (error) {
    console.error('❌ Kafka setup failed:', error.message);
  }
})();

// ============================================================================
// WEBSOCKET SETUP - Restaurant connections
// ============================================================================
wss.on('connection', (ws, req) => {
  const restaurantId = req.url.split('/').pop();
  console.log(`🔌 Restaurant ${restaurantId} connected via WebSocket`);

  if (!restaurantConnections.has(restaurantId)) {
    restaurantConnections.set(restaurantId, new Set());
  }
  restaurantConnections.get(restaurantId).add(ws);

  ws.on('close', () => {
    restaurantConnections.get(restaurantId).delete(ws);
    console.log(`❌ Restaurant ${restaurantId} disconnected`);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for restaurant ${restaurantId}:`, error.message);
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'rest-order-service' });
});

// ============================================================================
// RESTAURANT ORDERS ENDPOINTS
// ============================================================================

// GET incoming orders for restaurant — split by actionable status
app.get('/restaurant/:restaurantId/orders', async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // 'placed' = payment done, waiting for restaurant to accept/reject
    const { data: incoming, error: inError } = await supabase
      .from('orders')
      .select('id, customer_id, status, total_amount, delivery_address, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'placed')
      .order('created_at', { ascending: false });

    if (inError) {
      return res.status(400).json({ success: false, message: inError.message });
    }

    // 'accepted_by_restaurant' = already accepted, being prepared
    const { data: active, error: actError } = await supabase
      .from('orders')
      .select('id, customer_id, status, total_amount, delivery_address, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'accepted_by_restaurant')
      .order('created_at', { ascending: false });

    if (actError) {
      return res.status(400).json({ success: false, message: actError.message });
    }

    res.status(200).json({
      success: true,
      orders: incoming || [],          // needs accept/reject action
      active_orders: active || [],     // already accepted, in progress
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
});

// GET specific order
app.get('/orders/:orderId', async (req, res) => {
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

    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    res.status(200).json({ success: true, order, items: items || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching order', error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║        🍕 REST-ORDER-SERVICE Started on ${PORT}                               ║
║  Manages restaurant orders + WebSocket notifications to restaurants       ║
║  Connect: ws://localhost:${PORT}/restaurant/:restaurantId                       ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down rest-order-service...');
  producer.disconnect();
  consumer.disconnect();
  server.close();
  process.exit(0);
});
