// ============================================================================
// rag-chatbot/server.js - RAG Chatbot Microservice
// ============================================================================
// RESTful API server for the food delivery chatbot using RAG
// Endpoints:
//   GET /health - Health check
//   GET / - Service info
//   POST /api/rag/chat - Chat with the bot
// ============================================================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const ragRoutes = require('./routes/rag');

const PORT = process.env.PORT || 3015;
const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'rag-chatbot',
    uptime: process.uptime(),
  });
});

// ============================================================================
// SERVICE INFO ENDPOINT
// ============================================================================
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'rag-chatbot',
    version: '1.0.0',
    description: 'RAG-based food and restaurant chatbot using Supabase pgvector and Gemini LLM',
    endpoints: [
      'GET /health - Health check',
      'GET / - Service info',
      'POST /api/rag/chat - Chat with the bot',
    ],
  });
});

// ============================================================================
// RAG CHATBOT ROUTES
// ============================================================================
app.use('/api/rag', ragRoutes);

// ============================================================================
// 404 HANDLER
// ============================================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
  });
});

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================
app.use((error, req, res, next) => {
  console.error('💥 Unhandled error:', error.message);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║               🤖 RAG CHATBOT SERVICE Started on ${PORT}                       ║
║         Answering questions about restaurants and food items               ║
║                                                                            ║
║ Available endpoints:                                                       ║
║   GET  /health         - Health status                                    ║
║   GET  /               - Service information                              ║
║   POST /api/rag/chat   - Chat endpoint                                    ║
║                                                                            ║
║ To index restaurants & menu items:                                        ║
║   npm run rag:index                                                       ║
║                                                                            ║
║ To test the chatbot:                                                      ║
║   curl -X POST http://localhost:${PORT}/api/rag/chat \\                      ║
║     -H "Content-Type: application/json" \\                                  ║
║     -d '{"message": "Show me chicken biryani"}'                           ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down rag-chatbot service...');
  process.exit(0);
});
