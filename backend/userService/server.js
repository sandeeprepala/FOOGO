// ============================================================================
// userService/server.js - Authentication Microservice
// ============================================================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const authRoutes = require('./routes/auth');

const PORT = process.env.PORT || 3010;
const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'user-service' });
});

app.get('/', (req, res) => {
  res.status(200).json({
    service: 'user-service',
    version: '1.0.0',
    endpoints: [
      'POST /auth/register/:role',
      'POST /auth/login',
      'POST /auth/logout',
      'POST /auth/refresh',
    ],
  });
});

app.use('/auth', authRoutes);

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

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    🔐 USER-SERVICE Started on ${PORT}                          ║
║         Handles: Customer, Restaurant, Delivery Agent Auth                 ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down user-service...');
  process.exit(0);
});
