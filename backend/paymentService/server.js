// ============================================================================
// paymentService/server.js - Dummy Payment Processing Service
// ============================================================================
// Consumes: order.created
// Produces: payment.completed (always returns success or random failure)
// For real payments, integrate with Stripe, PayPal, etc. here

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Kafka } = require('kafkajs');

const PORT = process.env.PORT || 3014;
const app = express();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
});

const producer = kafka.producer({ idempotent: true });
const consumer = kafka.consumer({ groupId: 'payment-service-group' });

app.use(express.json());

// ============================================================================
// KAFKA SETUP - Consume order.created events
// ============================================================================
(async () => {
  try {
    await producer.connect();
    await consumer.connect();
    console.log('✅ Kafka connected');

    await consumer.subscribe({ topic: 'order.created', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const orderData = JSON.parse(message.value.toString());
          console.log(`📨 Received order.created:`, orderData.orderId);

          const { orderId, totalAmount } = orderData;

          // ================================================================
          // DUMMY PAYMENT PROCESSING
          // ================================================================
          // In production, this would integrate with Stripe, PayPal, etc.
          // For now: 90% success, 10% failure (for testing)
          // ================================================================

          const randomSuccess = Math.random() < 0.9;
          const paymentStatus = randomSuccess ? 'success' : 'failed';

          console.log(`💳 Processing payment for order ${orderId}: ${paymentStatus}`);

          // Store payment record in DB
          const { error: paymentError } = await supabase
            .from('payments')
            .insert([
              {
                order_id: orderId,
                amount: totalAmount,
                status: paymentStatus,
                method: 'card',
              },
            ]);

          if (paymentError) {
            console.error('Error storing payment:', paymentError.message);
            return;
          }

          // Produce payment.completed event
          await producer.send({
            topic: 'payment.completed',
            messages: [
              {
                key: `order-${orderId}`,
                value: JSON.stringify({
                  orderId,
                  status: paymentStatus,
                  amount: totalAmount,
                  timestamp: new Date().toISOString(),
                }),
              },
            ],
          });

          console.log(`✅ Payment event produced for order ${orderId}`);
        } catch (error) {
          console.error('Error processing order:', error.message);
        }
      },
    });
  } catch (error) {
    console.error('❌ Kafka setup failed:', error.message);
  }
})();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'payment-service' });
});

app.get('/', (req, res) => {
  res.status(200).json({
    service: 'payment-service',
    description: 'Dummy payment processor - consumes order.created, produces payment.completed',
    note: '90% success rate for testing. Replace with real payment gateway in production.',
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║          💳 PAYMENT-SERVICE Started on ${PORT}                                ║
║     Dummy processor: consumes order.created, produces payment.completed   ║
║                                                                            ║
║  Note: 90% success rate for testing. Integrate real gateway in production ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down payment-service...');
  producer.disconnect();
  consumer.disconnect();
  process.exit(0);
});
