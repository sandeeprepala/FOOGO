// ============================================================================
// rag-chatbot/services/retrieval.service.js - Vector Similarity Search
// ============================================================================
// Performs semantic search on chatbot_documents using pgvector
// Uses the match_chatbot_documents RPC function
// ============================================================================

const supabase = require('../db');

/**
 * Retrieve the most relevant documents for a query embedding
 * Uses the Supabase RPC function match_chatbot_documents
 *
 * @param {number[]} queryEmbedding - 384-dimensional query embedding
 * @param {Object} options - Search options
 * @param {number} options.matchCount - Number of results to return (default: 10)
 * @param {Object} options.filters - Optional structured filters
 * @returns {Promise<Array>} - Array of {id, source_type, source_id, content, metadata, similarity}
 */
async function retrieveRelevantDocuments(
  queryEmbedding,
  options = {}
) {
  const {
    matchCount = 10,
    filters = {},
  } = options;

  if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 384) {
    throw new Error('Query embedding must be a 384-dimensional array');
  }

  try {
    // Call the Supabase RPC function
    const { data, error } = await supabase.rpc('match_chatbot_documents', {
      query_embedding: queryEmbedding,
      match_count: matchCount,
    });

    if (error) {
      throw new Error(`Vector search failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Apply optional structured filters to the retrieved documents
    let results = data;

    if (filters.maxPrice !== undefined) {
      results = results.filter(
        (doc) =>
          doc.metadata &&
          doc.metadata.price !== undefined &&
          doc.metadata.price <= filters.maxPrice
      );
    }

    if (filters.onlyAvailable) {
      results = results.filter(
        (doc) =>
          doc.metadata &&
          doc.metadata.is_available === true &&
          doc.metadata.is_open === true
      );
    }

    if (filters.onlyOpen) {
      results = results.filter(
        (doc) =>
          doc.metadata &&
          doc.metadata.is_open === true
      );
    }

    if (filters.cuisineType) {
      const cuisineFilter = filters.cuisineType.toLowerCase();
      results = results.filter(
        (doc) =>
          doc.metadata &&
          doc.metadata.cuisine_type &&
          doc.metadata.cuisine_type.toLowerCase().includes(cuisineFilter)
      );
    }

    if (filters.category) {
      const categoryFilter = filters.category.toLowerCase();
      results = results.filter(
        (doc) =>
          doc.metadata &&
          doc.metadata.category &&
          doc.metadata.category.toLowerCase().includes(categoryFilter)
      );
    }

    return results;
  } catch (error) {
    console.error('❌ Retrieval failed:', error.message);
    throw error;
  }
}

/**
 * Fetch the authoritative record from the database
 * Ensures we have the latest data from the source of truth
 *
 * @param {string} sourceType - 'restaurant' or 'menu_item'
 * @param {number} sourceId - ID of the restaurant or menu_item
 * @returns {Promise<Object|null>} - The full database record or null if not found
 */
async function fetchSourceRecord(sourceType, sourceId) {
  try {
    if (sourceType === 'restaurant') {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, email, cuisine_type, address, lat, lng, is_open, created_at')
        .eq('id', sourceId)
        .single();

      if (error) {
        console.warn(`Restaurant ${sourceId} not found:`, error.message);
        return null;
      }

      return data;
    } else if (sourceType === 'menu_item') {
      const { data, error } = await supabase
        .from('menu_items')
        .select(
          `
          id,
          name,
          description,
          price,
          category,
          is_available,
          created_at,
          restaurant:restaurant_id (
            id,
            name,
            cuisine_type,
            address,
            is_open
          )
          `
        )
        .eq('id', sourceId)
        .single();

      if (error) {
        console.warn(`Menu item ${sourceId} not found:`, error.message);
        return null;
      }

      return data;
    } else {
      throw new Error(`Unknown source type: ${sourceType}`);
    }
  } catch (error) {
    console.error('❌ Failed to fetch source record:', error.message);
    throw error;
  }
}

module.exports = {
  retrieveRelevantDocuments,
  fetchSourceRecord,
};
