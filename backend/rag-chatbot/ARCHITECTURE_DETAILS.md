# 🏗️ RAG Chatbot - Architecture Details

Deep technical documentation of the RAG chatbot implementation.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Frontend)                          │
└────────────────────────────┬──────────────────────────────────┘
                             │
                             ▼
                    POST /api/rag/chat
                    { "message": "..." }
                             │
        ┌────────────────────┴────────────────────┐
        ▼                                         ▼
   Chat Controller                        Error Handler
        │                                         ▲
        ▼                                         │
   Chat Service ────────────────────────────────┤
        │                                        │
    ┌───┴───────────────────────────────────┬──┘
    │                                       │
    ▼                                       │
Query Embedding Service                    │
   (MiniLM)                                │
    │                                       │
    ├─────────────►[384-dim vector]         │
    │                                       │
    ▼                                       │
Retrieval Service                           │
   (Supabase pgvector)                      │
    │                                       │
    ├─────────────►[Top-K documents]        │
    │                                       │
    ▼                                       │
PostgreSQL Verification                    │
   (Source of Truth)                       │
    │                                       │
    ├─────────────►[Authoritative records]  │
    │                                       │
    ▼                                       │
Gemini Service                              │
   (LLM)                                    │
    │                                       │
    ├─────────────►[Natural language]       │
    │                                       │
    └───────────────────────────────────────┘
                    │
                    ▼
            Response to User
    { "success": true, "message": "..." }
```

## Layer 1: HTTP Request Handling

### chat.controller.js
```javascript
async function handleChatMessage(req, res)
  ├─ Validate input
  │  └─ Check: message is non-empty string
  ├─ Call chat.service.processUserMessage()
  └─ Return JSON response
     ├─ 200 if success
     └─ 500 if error
```

**Input validation:**
- Message must be a string
- Message must not be empty or whitespace-only
- Request must have Content-Type: application/json

**Error handling:**
- Catches exceptions from service layer
- Returns error message to client
- Logs full error in development mode

---

## Layer 2: Chat Orchestration

### chat.service.js

The main orchestrator that coordinates the entire RAG pipeline:

```javascript
async function processUserMessage(userMessage)
  │
  ├─ STEP 1: EMBEDDING
  │  └─ generateEmbedding(userMessage)
  │     ├─ Load/reuse MiniLM model
  │     ├─ Generate 384-dim embedding
  │     └─ Return numeric array
  │
  ├─ STEP 2: RETRIEVAL
  │  └─ retrieveRelevantDocuments(embedding)
  │     ├─ Call Supabase RPC function
  │     ├─ Top-10 similar documents
  │     └─ Return with similarity scores
  │
  ├─ STEP 3: SOURCE VERIFICATION
  │  └─ For each document:
  │     ├─ fetchSourceRecord()
  │     ├─ Get from restaurants or menu_items
  │     ├─ Verify current status
  │     └─ Build structured result
  │
  ├─ STEP 4: CONTEXT CONSTRUCTION
  │  └─ Format documents for Gemini
  │     ├─ Include relevance scores
  │     ├─ Clean sensitive data
  │     └─ Create human-readable context
  │
  ├─ STEP 5: LLM GENERATION
  │  └─ generateResponse(query, context)
  │     ├─ Call Gemini API
  │     ├─ Include RAG system instructions
  │     └─ Return natural language text
  │
  └─ RETURN FINAL RESPONSE
     ├─ success: boolean
     ├─ message: generated text
     ├─ results: structured data
     └─ metadata: query stats
```

**Key design decisions:**
- Synchronous flow (step-by-step)
- Each layer is independent
- Failures at any layer return structured error
- Logging at critical points

---

## Layer 3: Embedding Generation

### embedding.service.js

Uses Hugging Face Transformers.js for local inference:

```javascript
generateEmbedding(text)
  │
  ├─ LAZY LOAD MODEL (promise-based memoization)
  │  └─ First call:
  │     ├─ Download Xenova/all-MiniLM-L6-v2
  │     ├─ Cache in ~/.cache/huggingface/
  │     └─ Store in module variable
  │  
  │  └─ Subsequent calls:
  │     └─ Reuse cached model
  │
  └─ GENERATE EMBEDDING
     ├─ Input: string text
     ├─ Model settings:
     │  ├─ pooling: 'mean'
     │  └─ normalize: true (for cosine similarity)
     ├─ Output: Float32Array
     └─ Convert to numeric array [0.12, -0.34, ...]
```

**Model details:**
- **Name**: Xenova/all-MiniLM-L6-v2
- **Size**: ~100MB (downloaded once)
- **Dimensions**: 384
- **Type**: Sentence transformer
- **Best for**: Semantic similarity
- **Runtime**: ~100-200ms per query

**Normalization:**
- Enabled by default
- Ensures cosine distance works optimally
- Produces values in range [-1, 1]

**Batch processing:**
```javascript
generateEmbeddingsBatch(texts)
  └─ Input: array of strings
  └─ Output: array of 384-dim arrays
  └─ More efficient than sequential calls
```

---

## Layer 4: Document Retrieval

### retrieval.service.js

Performs vector similarity search via Supabase:

```javascript
retrieveRelevantDocuments(embedding, options)
  │
  ├─ VALIDATE INPUT
  │  └─ Ensure embedding is 384-dimensional
  │
  ├─ CALL SUPABASE RPC
  │  └─ match_chatbot_documents(
  │       query_embedding,
  │       match_count
  │     )
  │     ├─ Uses HNSW index
  │     ├─ Cosine distance metric
  │     └─ Returns top-K results
  │
  ├─ APPLY STRUCTURED FILTERS
  │  ├─ maxPrice: price <= N
  │  ├─ onlyAvailable: is_available = true AND is_open = true
  │  ├─ onlyOpen: is_open = true
  │  ├─ cuisineType: substring match
  │  └─ category: substring match
  │
  └─ RETURN RESULTS
     ├─ id: document ID
     ├─ source_type: 'restaurant' or 'menu_item'
     ├─ source_id: reference ID
     ├─ content: semantic text
     ├─ metadata: structured data
     └─ similarity: 0.0-1.0 score
```

**Vector search algorithm:**
- **Index type**: HNSW (Hierarchical Navigable Small World)
- **Distance metric**: vector_cosine_ops
- **Complexity**: O(log n) search
- **Tuned for**: Approximate nearest neighbor search

**Structured filters:**
- Applied AFTER vector search
- Reduce false positives
- Use database indexes for efficiency

**Source record fetching:**
```javascript
fetchSourceRecord(sourceType, sourceId)
  │
  ├─ IF sourceType === 'restaurant'
  │  └─ Query restaurants table
  │     ├─ SELECT: id, name, cuisine_type, address, lat, lng, is_open
  │     └─ EXCLUDE: email, password_hash, phone_no
  │
  └─ IF sourceType === 'menu_item'
     └─ Query menu_items table with JOIN
        ├─ SELECT menu_item fields
        ├─ SELECT restaurant (joined)
        └─ EXCLUDE sensitive fields
```

---

## Layer 5: Document Generation

### document-generation.service.js

Converts database records to RAG documents:

```javascript
generateRestaurantDocument(restaurant)
  │
  ├─ EXTRACT NON-SENSITIVE FIELDS
  │  ├─ id, name, cuisine_type
  │  ├─ address, lat, lng
  │  └─ is_open
  │
  ├─ FORMAT SEMANTIC CONTENT
  │  └─ Text readable for embedding
  │     ├─ "Restaurant Name: Paradise Restaurant"
  │     ├─ "Cuisine: Indian, Biryani"
  │     ├─ "Address: MG Road, Vijayawada"
  │     └─ "Currently Open: Yes"
  │
  └─ BUILD METADATA
     └─ JSONB for filtering & results
        ├─ restaurant_id
        ├─ restaurant_name
        ├─ cuisine_type
        ├─ is_open
        └─ address

generateMenuItemDocument(menuItem, restaurant)
  │
  ├─ EXTRACT NON-SENSITIVE FIELDS
  │  ├─ Menu: id, name, description, price, category, is_available
  │  └─ Restaurant: id, name, cuisine_type, address, is_open
  │
  ├─ FORMAT SEMANTIC CONTENT
  │  └─ Text readable for embedding
  │     ├─ "Food: Chicken Biryani"
  │     ├─ "Restaurant: Paradise Restaurant"
  │     ├─ "Price: ₹250"
  │     ├─ "Restaurant Address: MG Road, Vijayawada"
  │     ├─ "Restaurant Currently Open: Yes"
  │     └─ "Food Currently Available: Yes"
  │
  └─ BUILD METADATA
     └─ JSONB for filtering & results
        ├─ menu_item_id
        ├─ restaurant_id
        ├─ restaurant_name
        ├─ price
        ├─ category
        ├─ is_available
        ├─ is_open
        └─ cuisine_type
```

**Design principle:**
- 1 document = 1 semantic unit
- Restaurant = 1 document
- Menu item = 1 document
- No arbitrary chunking
- Join at query time, not at index time

---

## Layer 6: LLM Response Generation

### gemini.service.js

Generates natural language responses using Google Gemini:

```javascript
generateResponse(userQuery, retrievedDocuments)
  │
  ├─ BUILD RAG SYSTEM INSTRUCTION
  │  └─ String that enforces:
  │     ├─ Answer only from context
  │     ├─ Never invent restaurants/food
  │     ├─ Never invent prices/availability
  │     ├─ Say "no results" if needed
  │     ├─ Don't expose implementation
  │     ├─ Keep responses concise
  │     └─ Organize results clearly
  │
  ├─ FORMAT CONTEXT
  │  └─ For each document:
  │     ├─ Include relevance score
  │     ├─ Label source type
  │     ├─ Show full content
  │     └─ Separate with dividers
  │
  ├─ BUILD FULL PROMPT
  │  └─ System instruction + context + user query
  │
  ├─ CALL GEMINI API
  │  └─ POST to:
  │     https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
  │     
  │     ├─ Method: POST
  │     ├─ Headers: Content-Type: application/json, API key
  │     └─ Body:
  │        ├─ contents: [{ parts: [{ text: fullPrompt }] }]
  │        ├─ generationConfig:
  │        │  ├─ temperature: 0.7
  │        │  ├─ topK: 40
  │        │  ├─ topP: 0.95
  │        │  └─ maxOutputTokens: 512
  │        └─ safetySettings: [...content policies...]
  │
  ├─ PARSE RESPONSE
  │  └─ response.candidates[0].content.parts[0].text
  │
  └─ RETURN GENERATED TEXT
```

**LLM Configuration:**
- **Model**: gemini-2.5-flash (fast, efficient)
- **Temperature**: 0.7 (creative but consistent)
- **topK**: 40 (diverse vocabulary)
- **topP**: 0.95 (nucleus sampling)
- **maxOutputTokens**: 512 (reasonable length)

**Safety settings:**
- HARM_CATEGORY_HARASSMENT: BLOCK_MEDIUM_AND_ABOVE
- HARM_CATEGORY_HATE_SPEECH: BLOCK_MEDIUM_AND_ABOVE
- HARM_CATEGORY_SEXUALLY_EXPLICIT: BLOCK_MEDIUM_AND_ABOVE
- HARM_CATEGORY_DANGEROUS_CONTENT: BLOCK_MEDIUM_AND_ABOVE

**RAG System Instruction:**
- Enforces grounding in context
- Prevents hallucination
- Requires honest "no results" responses
- Protects system details

---

## Database Layer

### SQL Schema

```sql
CREATE TABLE chatbot_documents (
    id BIGINT PRIMARY KEY,
    source_type VARCHAR(50),    -- Index: (source_type, source_id)
    source_id BIGINT,           -- Reference to restaurants or menu_items
    content TEXT,               -- Semantic document
    embedding vector(384),      -- HNSW indexed
    metadata JSONB,             -- Structured data
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- HNSW INDEX
CREATE INDEX chatbot_documents_embedding_idx
    ON chatbot_documents
    USING hnsw (embedding vector_cosine_ops);

-- Composite index for lookups
CREATE INDEX idx_chatbot_documents_source
    ON chatbot_documents(source_type, source_id);

-- Timestamp index for cleanup
CREATE INDEX idx_chatbot_documents_updated
    ON chatbot_documents(updated_at DESC);
```

### RPC Function

```sql
CREATE FUNCTION match_chatbot_documents(
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
LANGUAGE SQL STABLE
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
```

**Key features:**
- Uses STABLE designation (no side effects)
- Cosine distance via `<=>` operator
- Similarity = 1 - distance (0-1 range)
- Ordered by distance (closest first)
- Filters out NULL embeddings

---

## Indexing Pipeline

### index-documents.js

Idempotent document indexing script:

```javascript
main()
  │
  ├─ INDEX RESTAURANTS
  │  └─ For each restaurant in batches:
  │     ├─ generateRestaurantDocument()
  │     ├─ generateEmbedding()
  │     └─ UPSERT into chatbot_documents
  │        └─ ON CONFLICT (source_type, source_id)
  │           UPDATE metadata, embedding, updated_at
  │
  └─ INDEX MENU ITEMS
     └─ For each menu item in batches:
        ├─ generateMenuItemDocument()
        ├─ generateEmbeddingsBatch()
        └─ UPSERT into chatbot_documents
           └─ ON CONFLICT (source_type, source_id)
              UPDATE metadata, embedding, updated_at
```

**Batch processing:**
- Processes 5 items per batch
- More efficient than one-by-one
- Recovers from individual failures
- Logs progress for monitoring

**Idempotency:**
- UNIQUE constraint on (source_type, source_id)
- UPSERT updates existing documents
- Safe to run multiple times
- Useful for re-indexing after data changes

**Error handling:**
- Catches per-document errors
- Logs failed documents
- Continues processing
- Reports summary at end

---

## Execution Flow - Example

**Query: "Show me chicken biryani"**

```
Time  Component              Action                    Data
────────────────────────────────────────────────────────────────
T=0   User                   Send request              {message: "..."}
      │
T=50  HTTP Controller        Validate input            ✓
      │
T=100 Chat Service           Start pipeline
      │
T=150 Embedding Service      Load model (cached)       ✓
      │
T=250 MiniLM                 Generate embedding        [0.12, -0.34, ...]
      │                      384 dimensions             (384 floats)
      │
T=350 Retrieval Service      Call Supabase RPC
      │
T=400 PostgreSQL (pgvector)  Execute:                  Top-10 docs
      │                      WHERE embedding NOT NULL
      │                      ORDER BY <=>
      │                      LIMIT 10
      │
T=450 Retrieval Service      Apply filters             Filter by price,
      │                      (optional)                availability
      │
T=480 Retrieval Service      Get results               {
                                                        id: 1,
                                                        similarity: 0.95,
                                                        ...
                                                       }
      │
T=530 Chat Service           Fetch source records      5 queries
      │
T=600 PostgreSQL (source)    Execute joins             Restaurants +
      │                                                Menu items
      │
T=650 Chat Service           Build context             RAG context text
      │
T=700 Gemini Service         Call API                  POST to GCP
      │
T=2000 Google Gemini         Generate response         ~1.3s (network)
      │
T=2100 Gemini Service        Parse response            Extract text
      │
T=2150 Chat Service          Build final response      {
                                                        message: "...",
                                                        results: [...]
                                                       }
      │
T=2200 HTTP Response         Send to client            JSON response

Total: ~2.2 seconds (network dependent)
```

---

## Error Handling Strategy

### Embedding Errors
```javascript
try {
  const embedding = await generateEmbedding(text);
} catch (error) {
  // Log and continue with next document
  failedDocuments.push({ type, id, error: error.message });
}
```

### Retrieval Errors
```javascript
try {
  const docs = await retrieveRelevantDocuments(embedding);
} catch (error) {
  return {
    success: false,
    message: "An error occurred...",
    error: error.message (in development)
  };
}
```

### LLM Errors
```javascript
try {
  const response = await generateResponse(query, docs);
} catch (error) {
  // Return graceful degradation
  return {
    success: false,
    message: "Could not generate response...",
    results: structuredResults (still useful)
  };
}
```

---

## Performance Characteristics

### Query Time Breakdown
- Embedding generation: 100-200ms
- Vector search: 5-10ms
- Source record fetch: 50-100ms
- Gemini API: 1-3 seconds
- **Total: 2-5 seconds (network dependent)**

### Embedding Time Breakdown
- Model loading: 5-10 seconds (first time only)
- Per embedding: 100-200ms
- Batch of 5: 400-600ms

### Storage Requirements
- Per document: ~2-4 KB
- 384-dim vector: ~1.5 KB (384 floats)
- Metadata JSONB: ~500 bytes
- Content TEXT: variable

### Index Footprint
- HNSW index: ~2-3x vector size
- B-tree indexes: ~1-2x column size
- Total overhead: ~50-100% of data

---

## Security Considerations

### Data Protection
- No email/password in documents
- No API keys in logs
- Service key never exposed to frontend
- Sensitive fields excluded from selects

### Vector Security
- Embeddings treated as indexes, not content
- pgvector doesn't leak semantic information
- Can't reverse embedding to text
- Index is database-level security

### API Security
- Gemini API key in .env (backend only)
- No key exposure in responses
- HTTPS required for production
- Rate limiting recommended

---

## Extensibility Points

### Custom Filters
```javascript
// Add in retrieveRelevantDocuments()
if (filters.customField) {
  results = results.filter(doc => ...);
}
```

### Document Augmentation
```javascript
// Modify generateMenuItemDocument()
// Add ratings, reviews, images, etc.
```

### Alternative LLM
```javascript
// Replace gemini.service.js
// Support: Claude, OpenAI, Llama, etc.
```

### Caching Layer
```javascript
// Add Redis cache in retrieval.service.js
// Cache vector search results
```

### Kafka Integration
```javascript
// Listen to restaurant/menu_item events
// Trigger incremental re-indexing
```

---

## Testing Checklist

- [ ] Embedding generation works
- [ ] Vector search returns results
- [ ] Source records are fetched
- [ ] Gemini API responds
- [ ] Full pipeline completes
- [ ] Error handling works
- [ ] Responses make sense
- [ ] Metadata is accurate
- [ ] No sensitive data leaked
- [ ] Performance is acceptable

---

## References

- Xenova/all-MiniLM-L6-v2: https://huggingface.co/Xenova/all-MiniLM-L6-v2
- Supabase pgvector: https://supabase.com/docs/guides/database/extensions/pgvector
- Google Gemini API: https://ai.google.dev/
- HNSW Algorithm: https://arxiv.org/abs/1802.02413
- Transformers.js: https://xenova.github.io/transformers.js/

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-08-17  
**Status**: Implementation Complete
