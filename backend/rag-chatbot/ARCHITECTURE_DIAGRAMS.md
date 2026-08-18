# 🎯 RAG Chatbot - Visual Architecture Guide

## Complete System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                   USER/FRONTEND                              │
└────────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                                        │ HTTP POST
                                        │ {message: "..."}
                                        ▼
        ┌───────────────────────────────────────────────────────────┐
        │ HTTP Layer: Express Server (server.js)                    │
        │ ┌─────────────────────────────────────────────────────┐   │
        │ │ POST /api/rag/chat                                  │   │
        │ │ (routed via routes/rag.js)                          │   │
        │ └─────────────────────────────────────────────────────┘   │
        └───────────────────┬──────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────────────────────┐
        │ Controller: chat.controller.js                            │
        │ ├─ Validate input                                        │
        │ ├─ Check message is non-empty string                     │
        │ └─ Call chat.service.processUserMessage()                │
        └───────────────────┬──────────────────────────────────────┘
                            │
        ┌───────────────────┴──────────────────────────────────────┐
        │                                                           │
        │ RAG PIPELINE (chat.service.js)                           │
        │ │                                                        │
        │ ├─── STEP 1: EMBEDDING ──────────────────────────────┐  │
        │ │   embedding.service.js                             │  │
        │ │   ├─ Lazy load Xenova/all-MiniLM-L6-v2            │  │
        │ │   ├─ Cache in memory (~100MB)                      │  │
        │ │   ├─ Generate 384-dimensional vector              │  │
        │ │   └─ Normalize for cosine distance                │  │
        │ │   [100-200ms]                                     │  │
        │ └──────────────────────────────────────────────────┘  │
        │                                                        │
        │ ├─── STEP 2: VECTOR SEARCH ─────────────────────────┐  │
        │ │   retrieval.service.js                             │  │
        │ │   ├─ Call Supabase RPC:                           │  │
        │ │   │  match_chatbot_documents()                    │  │
        │ │   ├─ Uses HNSW index                              │  │
        │ │   ├─ Cosine distance metric                       │  │
        │ │   ├─ Return top-10 documents                      │  │
        │ │   └─ Apply structured filters                     │  │
        │ │   [5-10ms]                                        │  │
        │ └──────────────────────────────────────────────────┘  │
        │                                                        │
        │ ├─── STEP 3: SOURCE VERIFICATION ───────────────────┐  │
        │ │   retrieval.service.js + db.js                     │  │
        │ │   ├─ For each document:                           │  │
        │ │   │  ├─ If 'restaurant': fetch from restaurants   │  │
        │ │   │  └─ If 'menu_item': fetch from menu_items     │  │
        │ │   ├─ Join with restaurant data                    │  │
        │ │   ├─ Get authoritative current status             │  │
        │ │   └─ Exclude sensitive fields                     │  │
        │ │   [50-100ms]                                      │  │
        │ └──────────────────────────────────────────────────┘  │
        │                                                        │
        │ ├─── STEP 4: CONTEXT CONSTRUCTION ──────────────────┐  │
        │ │   chat.service.js                                  │  │
        │ │   ├─ Format documents for LLM                     │  │
        │ │   ├─ Include relevance scores                     │  │
        │ │   ├─ Clean sensitive data                         │  │
        │ │   └─ Create human-readable text                   │  │
        │ │   [<5ms]                                          │  │
        │ └──────────────────────────────────────────────────┘  │
        │                                                        │
        │ ├─── STEP 5: LLM GENERATION ─────────────────────────┐  │
        │ │   gemini.service.js                                │  │
        │ │   ├─ Add RAG system instructions                  │  │
        │ │   ├─ Include retrieved context                    │  │
        │ │   ├─ POST to Google Gemini API                    │  │
        │ │   │  https://generativelanguage.googleapis.com   │  │
        │ │   ├─ Parse response                               │  │
        │ │   └─ Extract generated text                       │  │
        │ │   [1-3 seconds]                                   │  │
        │ └──────────────────────────────────────────────────┘  │
        │                                                        │
        └────────────────────┬─────────────────────────────────┘
                             │
                             ▼
        ┌───────────────────────────────────────────────────────────┐
        │ Build Final Response (chat.service.js)                    │
        │ {                                                         │
        │   success: true,                                         │
        │   message: "Generated response",                         │
        │   results: [{type, id, name, price, ...}],              │
        │   metadata: {query, docs_retrieved, results_count}       │
        │ }                                                         │
        └───────────────────┬──────────────────────────────────────┘
                            │
                            ▼ HTTP 200
                            
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND / USER RECEIVES RESPONSE                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ SUPABASE PostgreSQL (Production Database)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │ restaurants      │  │ menu_items       │  │ customers    │   │
│  ├──────────────────┤  ├──────────────────┤  └──────────────┘   │
│  │ id               │  │ id               │                     │
│  │ name             │  │ restaurant_id ─┐ │  ... (other tables) │
│  │ cuisine_type     │  │ name           │ │                     │
│  │ address          │  │ price          │ │                     │
│  │ is_open          │  │ category       │ │                     │
│  │ ...              │  │ is_available   │ │                     │
│  └──────────────────┘  │ ...            │ │                     │
│         ▲              └──────────────┬──┘                       │
│         │                            │                          │
│         └────────────────┬───────────┘                          │
│                          │                                      │
│                          ▼                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ chatbot_documents (RAG Index)                          │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ id              BIGINT PRIMARY KEY                     │    │
│  │ source_type     VARCHAR('restaurant'|'menu_item')      │    │
│  │ source_id       BIGINT (references restaurants/items)  │    │
│  │ content         TEXT (semantic document)               │    │
│  │ embedding       VECTOR(384) ◄── MiniLM 384-dim        │    │
│  │ metadata        JSONB {id, name, price, ...}          │    │
│  │ created_at      TIMESTAMP                              │    │
│  │ updated_at      TIMESTAMP                              │    │
│  │                                                         │    │
│  │ INDEXES:                                               │    │
│  │ ├─ HNSW on embedding (vector_cosine_ops)              │    │
│  │ ├─ B-tree on (source_type, source_id) UNIQUE          │    │
│  │ └─ B-tree on updated_at DESC                          │    │
│  │                                                         │    │
│  │ FUNCTIONS:                                             │    │
│  │ └─ match_chatbot_documents(embedding, match_count)    │    │
│  │    ├─ Inputs: 384-dim vector, default 10 results      │    │
│  │    ├─ Uses HNSW for fast search                       │    │
│  │    ├─ Calculates: 1 - (embedding <=> query)           │    │
│  │    └─ Returns: top-K by similarity (0.0-1.0)          │    │
│  └────────────────────────────────────────────────────────┘    │
│                          ▲                                      │
│                          │                                      │
│        WRITE: Index script  READ: Chat queries                 │
│        npm run rag:index     /api/rag/chat                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Dependencies

```
server.js
├── express
├── dotenv (.env)
└── routes/rag.js
    └── chat.controller.js
        └── chat.service.js
            ├── embedding.service.js
            │   └── @huggingface/transformers (MiniLM model)
            │       └── ~/.cache/huggingface/ (local model cache)
            │
            ├── retrieval.service.js
            │   ├── db.js
            │   │   └── @supabase/supabase-js
            │   │       └── Supabase PostgreSQL (pgvector)
            │   └── (calls RPC: match_chatbot_documents)
            │
            └── gemini.service.js
                └── fetch API (built-in)
                    └── Google Gemini LLM API
```

---

## Document Generation Flow

```
DATABASE                    SERVICE LAYER              INDEXING
────────────────────────────────────────────────────────────────

restaurants [5 records]
        │
        ├─ Paradise Restaurant
        ├─ Bawarchi Restaurant
        ├─ Restaurant X
        └─ ...
        │
        └──────────────────┐
                          │ generateRestaurantDocument()
                          ▼
                   ┌──────────────────┐
                   │ DOCUMENT 1:      │
                   │ "Restaurant Name:│
                   │  Paradise        │
                   │ Cuisine: Indian  │
                   │ Address: MG Road │
                   │ Open: Yes"       │
                   └──────────────────┘
                          │
                          ├─ generateEmbedding()
                          │  [384-dim vector]
                          │
                          └─ UPSERT to chatbot_documents
                             └─ ON CONFLICT UPDATE

menu_items [42 records]
        │
        ├─ Chicken Biryani @ Paradise
        ├─ Paneer Tikka @ Paradise
        ├─ Hakka Noodles @ Chinese Palace
        └─ ...
        │
        └──────────────────┐
                          │ generateMenuItemDocument()
                          ▼
                   ┌──────────────────────┐
                   │ DOCUMENT 1:          │
                   │ "Food: Chicken      │
                   │  Biryani             │
                   │ Restaurant: Paradise │
                   │ Cuisine: Indian      │
                   │ Price: ₹250          │
                   │ Available: Yes       │
                   │ Open: Yes"           │
                   └──────────────────────┘
                          │
                          ├─ generateEmbedding()
                          │  [384-dim vector]
                          │
                          └─ UPSERT to chatbot_documents
                             └─ ON CONFLICT UPDATE

RESULT: 47 documents indexed in chatbot_documents
```

---

## Query Processing Timeline

```
Time    Component              Action                          Output
─────────────────────────────────────────────────────────────────────

0ms     User sends query       "Show me chicken biryani"
        
50ms    HTTP Controller        Validate input                  ✓ Valid
        
100ms   Chat Service           Start pipeline
        
150ms   Embedding Service      Load MiniLM (cached)            ✓ Loaded
        
250ms   Embedding Service      Generate embedding              [384 floats]
        
350ms   Retrieval Service      Call Supabase RPC               
        
400ms   PostgreSQL             Execute match_chatbot_documents  Top-10
        (pgvector + HNSW)      WHERE embedding IS NOT NULL      docs
                               ORDER BY <=> LIMIT 10
                               
450ms   Retrieval Service      Filter results                  8 docs
        
480ms   Chat Service           Fetch source records            5 queries
        
550ms   PostgreSQL             JOIN restaurants + menu_items   Authoritative
        (source of truth)                                       data
        
620ms   Chat Service           Build RAG context               Context text
        
670ms   Gemini Service         Call Google API                 Sending...
        
2070ms  Google Gemini LLM      Generate response               ~1.4s network
        
2140ms  Response Parser        Extract text                    Generated text
        
2180ms  Chat Service           Build final response            {success, msg}
        
2230ms  HTTP Response          Send to client                  200 OK + JSON

TOTAL: ~2.2 seconds (network dependent, usually 2-5 seconds)
```

---

## Error Handling Flow

```
User Request
    │
    ├─ [Controller] Input validation
    │   ├─ Invalid? ──→ 400 Bad Request
    │   └─ Valid ──→ Continue
    │
    ├─ [Chat Service] Process message
    │   ├─ [Embedding] Generate embedding
    │   │   ├─ Error? ──→ Log & return error response
    │   │   └─ Success ──→ Continue
    │   │
    │   ├─ [Retrieval] Vector search
    │   │   ├─ DB error? ──→ Log & return error response
    │   │   ├─ No results? ──→ Continue (graceful)
    │   │   └─ Success ──→ Continue
    │   │
    │   ├─ [Source verification] Fetch records
    │   │   ├─ Record missing? ──→ Skip (log warning)
    │   │   └─ Success ──→ Continue
    │   │
    │   └─ [Gemini] Generate response
    │       ├─ API error? ──→ Log & return error response
    │       ├─ No response? ──→ Log & return error response
    │       └─ Success ──→ Continue
    │
    └─ [Response] Return to user
        ├─ Success: 200 + {success: true, message, results}
        └─ Error: 500 + {success: false, message, error}
```

---

## Data Security Flow

```
SENSITIVE FIELDS                          SAFE FIELDS
(Never in chatbot_documents)               (Included in docs)
────────────────────────────────────────  ───────────────────

❌ email                                   ✅ restaurant name
❌ password_hash                           ✅ cuisine type
❌ phone_no                                ✅ address (public)
                                          ✅ food name
                                          ✅ price
                                          ✅ description
                                          ✅ category
                                          ✅ availability
                                          ✅ open status

     ↓                                              ↓
     
Excluded from                              Embedded & searchable
embedding & indexing                       via vector search
```

---

## Scaling Considerations

```
Current Scale (Single Instance)
├─ ~50-100 restaurants: Fast
├─ ~500-1000 menu items: Fast
├─ 1-5 concurrent users: No issues
└─ ~2-5s per query: Acceptable

Scaling to 10x
├─ Option 1: Increase batch size in indexing
├─ Option 2: Add Redis caching for common queries
├─ Option 3: Replicate chatbot across multiple instances
├─ Option 4: Use Supabase PgBouncer for connection pooling
└─ Option 5: Implement query queueing

Scaling to 100x
├─ Consider: Dedicated vector database (optional future)
├─ Add: Request rate limiting
├─ Add: Response caching (Redis)
├─ Add: Load balancing (nginx)
└─ Monitor: Gemini API quotas
```

---

## Integration Points

```
EXISTING BACKEND                RAG CHATBOT
────────────────────────        ─────────────────────

api-gateway-customer    ◄────┐  
                               POST /api/rag/chat
restaurants table  ◄──────┐   │ (chatbot endpoint)
menu_items table   ◄──────┼───┤
                          │   
                          └──→ Returns structured results
                              for frontend rendering
```

---

This completes the RAG chatbot implementation with full architecture documentation!
