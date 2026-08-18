// ============================================================================
// rag-chatbot/controllers/chat.controller.js - Chat Endpoint Handler
// ============================================================================
// Handles POST /api/rag/chat requests
// ============================================================================

const { processUserMessage } = require('../services/chat.service');

/**
 * POST /api/rag/chat
 * Request body: { message: "I want chicken biryani" }
 * Returns: RAG-based response with structured results
 */
async function handleChatMessage(req, res) {
  try {
    const { message } = req.body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Request body must contain a non-empty "message" field',
      });
    }

    // Process the message through the RAG pipeline
    const response = await processUserMessage(message.trim());

    return res.status(response.success ? 200 : 500).json(response);
  } catch (error) {
    console.error('💥 Chat endpoint error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = {
  handleChatMessage,
};
