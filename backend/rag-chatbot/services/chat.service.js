// ============================================================================
// rag-chatbot/services/chat.service.js - Chat Orchestration
// ============================================================================
// Coordinates the entire RAG pipeline:
// User Query → Embedding → Vector Search → Gemini LLM → Response
// ============================================================================

const { generateEmbedding } = require('./embedding.service');
const { retrieveRelevantDocuments, fetchSourceRecord } = require('./retrieval.service');
const { generateResponse } = require('./gemini.service');

/**
 * Process a user message and return a RAG-based response
 * Pipeline:
 * 1. Generate embedding for user query
 * 2. Retrieve relevant documents using vector search
 * 3. Fetch authoritative source records
 * 4. Generate final response using Gemini
 * 5. Return structured result
 *
 * @param {string} userMessage - The user's query
 * @returns {Promise<Object>} - Response with message, results, and metadata
 */
async function processUserMessage(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') {
    throw new Error('User message must be a non-empty string');
  }

  try {
    console.log(`\n📝 Processing query: "${userMessage}"`);

    // ====================================================================
    // 1. EMBEDDING: Convert user query to 384-dimensional vector
    // ====================================================================
    console.log('⏳ Generating query embedding...');
    const queryEmbedding = await generateEmbedding(userMessage);
    console.log('✅ Query embedding generated (384 dimensions)');

    // ====================================================================
    // 2. RETRIEVAL: Find top-K similar documents
    // ====================================================================
    console.log('⏳ Retrieving relevant documents from vector database...');
    const retrievedDocuments = await retrieveRelevantDocuments(
      queryEmbedding,
      {
        matchCount: 10,
        filters: {}, // Could add intelligent filter parsing here later
      }
    );

    console.log(`✅ Retrieved ${retrievedDocuments.length} relevant documents`);

    // ====================================================================
    // 3. CONTEXT BUILDING: Fetch authoritative records
    // ====================================================================
    let structuredResults = [];

    if (retrievedDocuments.length > 0) {
      console.log('⏳ Fetching authoritative source records...');

      // Fetch full records for each retrieved document
      for (const doc of retrievedDocuments) {
        const { source_type, source_id, metadata } = doc;

        try {
          const sourceRecord = await fetchSourceRecord(source_type, source_id);

          if (sourceRecord) {
            if (source_type === 'restaurant') {
              structuredResults.push({
                type: 'restaurant',
                restaurant_id: sourceRecord.id,
                restaurant_name: sourceRecord.name,
                cuisine_type: sourceRecord.cuisine_type,
                address: sourceRecord.address,
                is_open: sourceRecord.is_open,
              });
            } else if (source_type === 'menu_item') {
              structuredResults.push({
                type: 'menu_item',
                menu_item_id: sourceRecord.id,
                restaurant_id: sourceRecord.restaurant.id,
                restaurant_name: sourceRecord.restaurant.name,
                food_name: sourceRecord.name,
                price: parseFloat(sourceRecord.price),
                category: sourceRecord.category,
                description: sourceRecord.description,
                is_available: sourceRecord.is_available,
                is_open: sourceRecord.restaurant.is_open,
              });
            }
          }
        } catch (error) {
          console.warn(
            `Failed to fetch source record for ${source_type}:${source_id}:`,
            error.message
          );
        }
      }

      console.log(`✅ Fetched ${structuredResults.length} structured results`);
    }

    // ====================================================================
    // 4. LLM GENERATION: Generate natural language response
    // ====================================================================
    console.log('⏳ Generating response with Gemini LLM...');
    const llmResponse = await generateResponse(
      userMessage,
      retrievedDocuments
    );
    console.log('✅ Response generated');

    // ====================================================================
    // 5. BUILD FINAL RESPONSE
    // ====================================================================
    return {
      success: true,
      message: llmResponse,
      results: structuredResults,
      metadata: {
        query: userMessage,
        documents_retrieved: retrievedDocuments.length,
        results_count: structuredResults.length,
      },
    };
  } catch (error) {
    console.error('❌ Chat processing failed:', error.message);

    return {
      success: false,
      message: 'An error occurred while processing your query. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    };
  }
}

module.exports = {
  processUserMessage,
};
