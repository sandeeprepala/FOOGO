// ============================================================================
// delAgentMatchingService/server.js - Delivery Agent Matching
// ============================================================================
// Consumes: restaurant.accepted
// Produces: agent.assigned
// Uses Redis SETNX for concurrency control (first agent wins)

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Kafka } = require('kafkajs');
const Redis = require('ioredis');
const { WebSocketServer } = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3016;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const kafka = new Kafka({
  clientId: 'del-agent-matching-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
});

const producer = kafka.producer({ idempotent: true });
const consumer = kafka.consumer({ groupId: 'del-agent-matching-service-group' });

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

app.use(express.json());

// Store active WebSocket connections for agents
const agentConnections = new Map();

// ============================================================================
// KAFKA SETUP - Consume restaurant.accepted
// ============================================================================
(async () => {
  try {
    await producer.connect();
    await consumer.connect();
    console.log('✅ Kafka connected');

    await consumer.subscribe({ topic: 'restaurant.accepted', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const orderData = JSON.parse(message.value.toString());
          console.log(`📨 Received restaurant.accepted:`, orderData.orderId);

          const { orderId, restaurantId } = orderData;

          // Get order details
          const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

          if (!order) return;

          // Find nearby delivery agents (within 5km) using DB RPC
          console.log(`Searching nearby agents for order ${orderId} at (${order.delivery_lat}, ${order.delivery_lng})`);
          let agentsResult;
          try {
            console.log("🔍 Searching for nearby delivery agents...");

            console.log("📍 Coordinates:", {
            lat: order.delivery_lat,
            lng: order.delivery_lng
            });

            console.log("⏳ Calling Supabase RPC...");

            agentsResult = await supabase.rpc('nearby_delivery_agents', {
            p_lat: order.delivery_lat,
            p_lng: order.delivery_lng,
            p_radius_km: 5,
            });

            console.log("✅ RPC returned!");

            console.log("RPC result:", agentsResult);
          } catch (e) {
            console.error('RPC nearby_delivery_agents error:', e.message || e);
            agentsResult = { data: null, error: e };
          }

          let agents = (agentsResult && agentsResult.data) || null;
          const error = (agentsResult && agentsResult.error) || null;

          const orderLat = order.delivery_lat || 28.6139;
          const orderLng = order.delivery_lng || 77.2090;

          // If RPC returned nothing, fallback to JS haversine computation
          if (!agents || agents.length === 0) {
            console.log(`RPC returned no agents for order ${orderId}, falling back to JS search`);

            // Fetch available agents from DB
            const { data: allAgents, error: fetchErr } = await supabase
              .from('delivery_agents')
              .select('*')
              .eq('is_available', true);

            if (fetchErr || !allAgents) {
              console.error('Failed to fetch delivery_agents for fallback:', fetchErr?.message || fetchErr);
            } else {
              const toRadians = (deg) => (deg * Math.PI) / 180;
              const haversineKm = (lat1, lon1, lat2, lon2) => {
                const R = 6371; // Earth radius km
                const dLat = toRadians(lat2 - lat1);
                const dLon = toRadians(lon2 - lon1);
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
              };

              const radiusKm = 5;
              agents = allAgents
                .map((a) => ({ ...a, distance_km: haversineKm(orderLat, orderLng, a.lat || 28.6150, a.lng || 77.2150) }))
                .filter((a) => a.distance_km <= radiusKm)
                .sort((a, b) => a.distance_km - b.distance_km);

              console.log(`Fallback found ${agents ? agents.length : 0} agents near order ${orderId}`);
            }
          }

          // Broadcast order to nearby agents via WebSocket
          const orderBroadcast = {
            event: 'nearby_order',
            orderId: order.id,
            restaurantName: 'Restaurant',
            totalAmount: order.total_amount,
            deliveryAddress: order.delivery_address,
            deliveryLat: orderLat,
            deliveryLng: orderLng,
            timestamp: new Date().toISOString(),
          };

          let broadcastCount = 0;

          // Attempt targeted broadcast to matched agents first
          if (agents && agents.length > 0) {
            agents.forEach((agent) => {
              const key = String(agent.id);
              const agentClients = agentConnections.get(key);
              if (agentClients && agentClients.size > 0) {
                agentClients.forEach((ws) => {
                  if (ws.readyState === 1) { // OPEN
                    ws.send(JSON.stringify(orderBroadcast));
                    broadcastCount++;
                  }
                });
                console.log(`📲 Broadcast order ${orderId} to agent ${agent.id}`);
              }
            });
          }

          // If no targeted client received it (e.g. key mismatch or guest testing), broadcast to ALL active WebSocket connections
          if (broadcastCount === 0 && agentConnections.size > 0) {
            console.log(`📲 Fallback broadcast order ${orderId} to ALL connected agent sockets (${agentConnections.size} keys)`);
            agentConnections.forEach((clients, key) => {
              clients.forEach((ws) => {
                if (ws.readyState === 1) {
                  ws.send(JSON.stringify(orderBroadcast));
                  broadcastCount++;
                }
              });
            });
          }
        } catch (error) {
          console.error('Error processing restaurant.accepted:', error && error.message);
          if (error && error.stack) console.error(error.stack);
        }
      },
    });
  } catch (error) {
    console.error('❌ Kafka setup failed:', error.message);
  }
})();

// ============================================================================
// WEBSOCKET - Agent connections
// ============================================================================
wss.on('connection', (ws, req) => {
  const agentId = req.url.split('/').pop();
  console.log(`🔌 Agent ${agentId} connected via WebSocket`);

  if (!agentConnections.has(agentId)) {
    agentConnections.set(agentId, new Set());
  }
  agentConnections.get(agentId).add(ws);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.action === 'accept_delivery') {
        // ================================================================
        // CRITICAL: Redis SETNX for concurrency control
        // ================================================================
        // Only the first agent to execute this wins
        // SET order:lock:{orderId} {agentId} NX EX 30
        // If success → this agent won
        // If failed → another agent already accepted
        // ================================================================

        const orderId = data.orderId;
        const lockKey = `order:lock:${orderId}`;

        const locked = await redis.set(lockKey, agentId, 'NX', 'EX', 30);

        if (locked) {
          // ✅ This agent won the race!
          console.log(`✅ Agent ${agentId} accepted order ${orderId}`);

          // Update order in DB
          const { data: order, error } = await supabase
            .from('orders')
            .update({
              delivery_agent_id: agentId,
              status: 'agent_assigned',
            })
            .eq('id', orderId)
            .select();

          if (!error) {
            // Produce agent.assigned event
            await producer.send({
              topic: 'agent.assigned',
              messages: [
                {
                  key: `order-${orderId}`,
                  value: JSON.stringify({
                    orderId,
                    agentId,
                    status: 'agent_assigned',
                    timestamp: new Date().toISOString(),
                  }),
                },
              ],
            });

            ws.send(JSON.stringify({
              event: 'accepted',
              orderId,
              message: 'You accepted this delivery!',
            }));
          }
        } else {
          // ❌ Another agent beat us
          console.log(`❌ Agent ${agentId} lost race for order ${orderId}`);
          ws.send(JSON.stringify({
            event: 'already_taken',
            orderId,
            message: 'Another agent already accepted this order',
          }));
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error.message);
    }
  });

  ws.on('close', () => {
    agentConnections.get(agentId)?.delete(ws);
    console.log(`❌ Agent ${agentId} disconnected`);
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'del-agent-matching-service' });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║         🚗 DELIVERY-AGENT-MATCHING Started on ${PORT}                           ║
║  Matches orders to nearby agents + Redis SETNX concurrency control        ║
║  Connect: ws://localhost:${PORT}/agent/:agentId                               ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down del-agent-matching-service...');
  producer.disconnect();
  consumer.disconnect();
  server.close();
  process.exit(0);
});
