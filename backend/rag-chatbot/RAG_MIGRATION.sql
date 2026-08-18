-- ============================================================================
-- RAG CHATBOT MIGRATION - Supabase PostgreSQL
-- ============================================================================
-- Run this entire script in Supabase SQL editor to enable pgvector
-- and set up the RAG infrastructure for the food delivery chatbot
-- ============================================================================

-- ============================================================================
-- 1. ENABLE PGVECTOR EXTENSION
-- ============================================================================
-- This allows us to store and search embeddings (384-dimensional vectors)
CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================================================
-- 2. CREATE CHATBOT_DOCUMENTS TABLE
-- ============================================================================
-- This table stores RAG documents (one per restaurant + one per menu item)
-- with their embeddings and metadata
CREATE TABLE IF NOT EXISTS chatbot_documents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Document source: 'restaurant' or 'menu_item'
    source_type VARCHAR(50) NOT NULL,
    
    -- Foreign key: references restaurants.id or menu_items.id
    source_id BIGINT NOT NULL,

    -- The actual text content used for embedding and display
    content TEXT NOT NULL,

    -- 384-dimensional embedding from Xenova/all-MiniLM-L6-v2
    embedding vector(384),

    -- Structured metadata for filtering and result construction
    metadata JSONB,

    -- Audit timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: one document per source to avoid duplicates
    UNIQUE(source_type, source_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chatbot_documents_source 
    ON chatbot_documents(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_documents_updated 
    ON chatbot_documents(updated_at DESC);


-- ============================================================================
-- 3. CREATE HNSW VECTOR INDEX FOR FAST SIMILARITY SEARCH
-- ============================================================================
-- HNSW is optimized for high-dimensional vector search
-- vector_cosine_ops means we use cosine distance for similarity
CREATE INDEX IF NOT EXISTS chatbot_documents_embedding_idx
    ON chatbot_documents
    USING hnsw (embedding vector_cosine_ops);


-- ============================================================================
-- 4. CREATE RPC FUNCTION FOR VECTOR SIMILARITY SEARCH
-- ============================================================================
-- This function performs semantic search on the embedded documents
-- Returns the top-K most similar documents with their similarity scores
CREATE OR REPLACE FUNCTION match_chatbot_documents(
    query_embedding vector(384),
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    id BIGINT,
    source_type VARCHAR,
    source_id BIGINT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        cd.id,
        cd.source_type,
        cd.source_id,
        cd.content,
        cd.metadata,
        1 - (cd.embedding <=> query_embedding) AS similarity
    FROM chatbot_documents cd
    WHERE cd.embedding IS NOT NULL
    ORDER BY cd.embedding <=> query_embedding
    LIMIT match_count;
$$;


-- ============================================================================
-- 5. REFERENCE INTEGRITY CONSTRAINTS (Optional but Recommended)
-- ============================================================================
-- If you want to enforce that source_id references valid records,
-- uncomment these. For now, commented out to allow independent testing.
-- ALTER TABLE chatbot_documents
-- ADD CONSTRAINT fk_restaurant_documents
--     FOREIGN KEY (source_id) 
--     REFERENCES restaurants(id) 
--     ON DELETE CASCADE
--     WHERE source_type = 'restaurant';

-- ============================================================================
-- Done! 
-- ============================================================================
-- You can now:
-- 1. Run the indexing script: npm run rag:index
-- 2. Start the RAG chatbot server: npm start
-- 3. POST to /api/rag/chat with a message
-- ============================================================================
