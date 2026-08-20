// ============================================================================
// locationUpdateService/server.js - GPS Location Tracking
// ============================================================================
// Handles delivery agent GPS pings
// Hot path: Write to Redis immediately
// Cold path: Batch sync to Postgres every 30s
// Broadcasts live location to customer via WebSocket

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');
const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3017;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const kafka = new Kafka({
  clientId: 'location-update-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
});

const producer = kafka.producer({ idempotent: true });

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

app.use(express.json());

// Store customer order tracking connections: { orderId: Set<ws> }
const orderConnections = new Map();

// ============================================================================
// KAFKA SETUP
// ============================================================================
(async () => {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected');
  } catch (error) {
    console.error('❌ Kafka connection failed:', error.message);
  }
})();

// ============================================================================
// BATCH SYNC - Every 30s, write Redis locations to Postgres
// ============================================================================
setInterval(async () => {
  try {
    const pattern = 'agent:location:*';
    const keys = await redis.keys(pattern);

    if (keys.length === 0) return;

    for (const key of keys) {
      const agentId = key.replace('agent:location:', '');
      const locationData = await redis.get(key);

      if (!locationData) continue;

      const [lat, lng] = locationData.split(',');

      // Get active orders for this agent
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('delivery_agent_id', agentId)
        .eq('status', 'on_the_way');

      // Insert into delivery_tracking (historical record)
      if (orders && orders.length > 0) {
        const trackingRecords = orders.map((o) => ({
          order_id: o.id,
          delivery_agent_id: agentId,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        }));

        await supabase
          .from('delivery_tracking')
          .insert(trackingRecords);
      }
    }

    console.log(`✅ Batch synced ${keys.length} agent locations to Postgres`);
  } catch (error) {
    console.error('Batch sync error:', error.message);
  }
}, 30000); // Every 30 seconds

// ============================================================================
// WEBSOCKET - Customer order tracking
// ============================================================================
wss.on('connection', (ws, req) => {
  const orderId = req.url.split('/').pop();
  console.log(`🔌 Customer connected to order ${orderId} tracking`);

  if (!orderConnections.has(orderId)) {
    orderConnections.set(orderId, new Set());
  }
  orderConnections.get(orderId).add(ws);

  ws.on('close', () => {
    orderConnections.get(orderId)?.delete(ws);
    console.log(`❌ Customer disconnected from order ${orderId}`);
  });
});

// ============================================================================
// LOCATION UPDATE ENDPOINT - POST /location/update
// ============================================================================
/**
 * Delivery agent sends GPS ping
 * Hot path: Write to Redis immediately (TTL 30s)
 * Broadcast to customer via WebSocket
 */
app.post('/update', async (req, res) => {
  try {
    const agentId = req.user?.id || req.body.agent_id;
    const { lat, lng, order_id } = req.body;

    if (!agentId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'agent_id, lat, lng required',
      });
    }

    // ================================================================
    // HOT PATH: Write to Redis immediately (300s TTL)
    // ================================================================
    const locationKey = `agent:location:${agentId}`;
    await redis.set(locationKey, `${lat},${lng}`, 'EX', 300);

    // Also persist agent location to delivery_agents table in Supabase
    try {
      await supabase
        .from('delivery_agents')
        .update({ lat: parseFloat(lat), lng: parseFloat(lng) })
        .or(`id.eq.${agentId},user_id.eq.${agentId}`);
    } catch (e) {}

    console.log(`📍 Agent ${agentId} location updated: ${lat}, ${lng}`);

    // Broadcast live location to tracking customer WebSockets
    const updatePayload = {
      event: 'live_location',
      agentId,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      timestamp: new Date().toISOString(),
    };

    let sentCount = 0;
    if (order_id) {
      const key = String(order_id);
      const customers = orderConnections.get(key);
      if (customers && customers.size > 0) {
        customers.forEach((ws) => {
          if (ws.readyState === 1) { // OPEN
            ws.send(JSON.stringify(updatePayload));
            sentCount++;
          }
        });
        console.log(`📡 Broadcast live location for order ${order_id} to ${sentCount} customer sockets`);
      }
    }

    // Fallback broadcast to all active order tracking sockets if no specific target received it
    if (sentCount === 0 && orderConnections.size > 0) {
      orderConnections.forEach((customers) => {
        customers.forEach((ws) => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify(updatePayload));
            sentCount++;
          }
        });
      });
      console.log(`📡 Broadcast live location fallback to ${sentCount} tracking sockets`);
    }

    res.status(200).json({
      success: true,
      message: 'Location updated',
    });
  } catch (error) {
    console.error('Location update error:', error.message);
    res.status(500).json({ success: false, message: 'Error updating location', error: error.message });
  }
});

// ============================================================================
// GET AGENT LOCATION - GET /location/:agentId
// ============================================================================
app.get('/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    const locationData = await redis.get(`agent:location:${agentId}`);

    if (locationData) {
      const [lat, lng] = locationData.split(',');
      return res.status(200).json({
        success: true,
        agentId,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        source: 'redis_cache',
      });
    }

    // DB Fallback if Redis key expired
    const { data: agent } = await supabase
      .from('delivery_agents')
      .select('lat, lng')
      .eq('id', agentId)
      .maybeSingle();

    if (agent && agent.lat && agent.lng) {
      return res.status(200).json({
        success: true,
        agentId,
        lat: parseFloat(agent.lat),
        lng: parseFloat(agent.lng),
        source: 'db',
      });
    }

    res.status(404).json({
      success: false,
      message: 'Agent location not found',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching location', error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'location-update-service' });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║         📍 LOCATION-UPDATE-SERVICE Started on ${PORT}                          ║
║  Handles GPS pings, Redis hot-path + Postgres cold-path + WebSocket live ║
║  Connect: ws://localhost:${PORT}/orders/:orderId for live tracking             ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down location-update-service...');
  producer.disconnect();
  server.close();
  process.exit(0);
});
