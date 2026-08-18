// ============================================================================
// rag-chatbot/services/embedding.service.js - MiniLM Embeddings
// ============================================================================
// Generates 384-dimensional embeddings using Xenova/all-MiniLM-L6-v2
// Model is loaded once and reused for all requests
// ============================================================================

const { pipeline } = require('@xenova/transformers');

let embeddingModel = null;
let modelLoadPromise = null;

/**
 * Load the embedding model (lazy loaded on first use)
 * Uses promise memoization to prevent multiple concurrent loads
 */
async function loadModel() {
  if (embeddingModel !== null) {
    return embeddingModel;
  }

  if (modelLoadPromise !== null) {
    return modelLoadPromise;
  }

  modelLoadPromise = (async () => {
    try {
      console.log('⏳ Loading Xenova/all-MiniLM-L6-v2 model...');
      embeddingModel = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
      console.log('✅ Embedding model loaded successfully');
      return embeddingModel;
    } catch (error) {
      console.error('❌ Failed to load embedding model:', error.message);
      modelLoadPromise = null;
      throw error;
    }
  })();

  return modelLoadPromise;
}

/**
 * Generate a 384-dimensional embedding for the given text
 *
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - A 384-dimensional array suitable for pgvector
 */
async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  try {
    const model = await loadModel();

    // Generate embedding (returns a Tensor)
    const embedding = await model(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert to plain JavaScript array
    // embedding.data is a Float32Array, convert to regular array
    const embeddingArray = Array.from(embedding.data);

    // Verify the dimensions
    if (embeddingArray.length !== 384) {
      throw new Error(
        `Expected 384-dimensional embedding, got ${embeddingArray.length}`
      );
    }

    return embeddingArray;
  } catch (error) {
    console.error('❌ Embedding generation failed:', error.message);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than generating them one by one
 *
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} - Array of 384-dimensional embeddings
 */
async function generateEmbeddingsBatch(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts must be a non-empty array');
  }

  try {
    const model = await loadModel();

    const embeddings = await model(texts, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert to plain arrays
    return texts.map((_, index) => Array.from(embeddings[index].data));
  } catch (error) {
    console.error('❌ Batch embedding generation failed:', error.message);
    throw error;
  }
}

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
};
