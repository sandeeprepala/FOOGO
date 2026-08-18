// ============================================================================
// rag-chatbot/routes/rag.js - RAG Chatbot Routes
// ============================================================================

const express = require('express');
const { handleChatMessage } = require('../controllers/chat.controller');

const router = express.Router();

/**
 * POST /api/rag/chat
 * Request body: { message: "I want chicken biryani" }
 * Response: { success: true, message: "...", results: [...] }
 */
router.post('/chat', handleChatMessage);

module.exports = router;
