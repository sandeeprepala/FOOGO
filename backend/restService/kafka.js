// ============================================================================
// restService/kafka.js - Kafka Producer & Consumer
// ============================================================================
// This service produces events to Kafka (e.g., order status updates)
// It also consumes events that affect restaurant operations

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'restaurant-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
  connectionTimeout: 10000,
  requestTimeout: 10000,
});

const producer = kafka.producer({ idempotent: true });
const consumer = kafka.consumer({ groupId: 'restaurant-service-group' });

module.exports = {
  kafka,
  producer,
  consumer,
};
