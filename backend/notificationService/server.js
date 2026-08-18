// ============================================================================
// notificationService/server.js - Notification Service
// ============================================================================
// Simple event consumer that stubs notifications
// Consumes: agent.assigned, restaurant.rejected, order.confirmed, etc.
// Stubs: console.log (replace with SMS/Email integration in production)

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { Kafka } = require('kafkajs');

const PORT = process.env.PORT || 3019;
const app = express();

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
});

const consumer = kafka.consumer({ groupId: 'notification-service-group' });

let isRunning = false;

// ============================================================================
// KAFKA SETUP - Consume all notification events
// ============================================================================
(async () => {
  try {
    await consumer.connect();
    console.log('✅ Kafka Consumer connected');

    // Subscribe to all relevant topics
    const topics = [
      'order.created',
      'payment.completed',
      'order.confirmed',
      'restaurant.accepted',
      'restaurant.rejected',
      'agent.assigned',
      'location.updates',
    ];

    await consumer.subscribe({ topics, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          console.log(`\n📬 Notification Event`);
          console.log(`   Topic: ${topic}`);
          console.log(`   Data:`, JSON.stringify(data, null, 2));

          // ================================================================
          // STUBS FOR DIFFERENT EVENT TYPES
          // In production: integrate with Twilio (SMS), SendGrid (Email), etc.
          // ================================================================

          if (topic === 'order.created') {
            console.log(`   📧 [STUB] Sending SMS to customer: "Order created"`);
          }

          if (topic === 'payment.completed') {
            if (data.status === 'success') {
              console.log(`   📧 [STUB] Sending SMS to customer: "Payment successful, order confirmed"`);
            } else {
              console.log(`   📧 [STUB] Sending SMS to customer: "Payment failed, please retry"`);
            }
          }

          if (topic === 'order.confirmed') {
            console.log(`   📧 [STUB] Sending SMS to restaurant: "New order to prepare"`);
          }

          if (topic === 'restaurant.accepted') {
            console.log(`   📧 [STUB] Sending SMS to customer: "Restaurant accepted your order"`);
            console.log(`   🔍 [STUB] Searching for nearby delivery agents...`);
          }

          if (topic === 'restaurant.rejected') {
            console.log(`   📧 [STUB] Sending SMS to customer: "Order rejected. Refund initiated."`);
            console.log(`   📧 [STUB] Reason: ${data.reason}`);
          }

          if (topic === 'agent.assigned') {
            console.log(`   📧 [STUB] Sending SMS to customer: "Agent assigned, tracking details sent"`);
            console.log(`   📧 [STUB] Sending SMS to agent: "New delivery order assigned"`);
          }

          if (topic === 'location.updates') {
            console.log(`   📍 [STUB] Agent location updated: ${data.lat}, ${data.lng}`);
          }
        } catch (error) {
          console.error('Error processing notification:', error.message);
        }
      },
    });

    isRunning = true;
  } catch (error) {
    console.error('❌ Kafka setup failed:', error.message);
  }
})();

// ============================================================================
// EXPRESS ENDPOINTS
// ============================================================================

app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'notification-service',
    kafkaConnected: isRunning,
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    service: 'notification-service',
    description: 'Event consumer that stubs notifications',
    subscribedTopics: [
      'order.created',
      'payment.completed',
      'order.confirmed',
      'restaurant.accepted',
      'restaurant.rejected',
      'agent.assigned',
      'location.updates',
    ],
    note: 'SMS/Email stubs use console.log. Integrate Twilio/SendGrid in production.',
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║          🔔 NOTIFICATION-SERVICE Started on ${PORT}                            ║
║    Event consumer: Stubs notifications (SMS/Email in production)          ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down notification-service...');
  consumer.disconnect();
  process.exit(0);
});
