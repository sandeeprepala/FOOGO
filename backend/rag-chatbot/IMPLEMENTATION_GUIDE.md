# 🚀 RAG Chatbot Implementation Guide

Complete step-by-step guide to deploy and test the RAG-based chatbot system.

## ✅ What Has Been Implemented

### File Structure
```
backend/rag-chatbot/
├── .env                              # Environment configuration
├── .env.example                      # Template for .env (create if needed)
├── package.json                      # Dependencies: @huggingface/transformers, express, @supabase/supabase-js
├── db.js                            # Supabase client initialization
├── server.js                        # Express server entry point
├── README.md                        # Comprehensive documentation
├── RAG_MIGRATION.sql                # SQL migration for pgvector setup
│
├── services/
│   ├── embedding.service.js         # MiniLM embeddings (384-dim, locally cached)
│   ├── document-generation.service.js # Generate RAG documents from DB records
│   ├── retrieval.service.js         # Vector search via Supabase RPC
│   ├── gemini.service.js            # Google Gemini LLM integration
│   └── chat.service.js              # Orchestrates entire RAG pipeline
│
├── controllers/
│   └── chat.controller.js           # HTTP request handler
│
├── routes/
│   └── rag.js                       # API routes
│
└── scripts/
    └── index-documents.js           # Idempotent indexing script
```

### Key Features Implemented

1. **Embedding Service**
   - Uses Xenova/all-MiniLM-L6-v2 (384 dimensions)
   - Runs locally (no external API required)
   - Model cached after first load
   - Supports batch processing

2. **Document Generation**
   - 1 document per restaurant
   - 1 document per menu item (includes restaurant data)
   - Semantic text representation
   - Structured metadata (no sensitive data)

3. **Vector Search**
   - Supabase pgvector storage
   - HNSW index for fast similarity search
   - Cosine distance metric
   - RPC function for efficient retrieval

4. **RAG Pipeline**
   - Query embedding
   - Vector similarity search
   - Source of truth verification (PostgreSQL)
   - Context construction
   - Gemini LLM response

5. **Chat API**
   - POST /api/rag/chat endpoint
   - Structured JSON responses
   - Error handling
   - Development mode debugging

---

## 🔧 Deployment Steps

### Step 1: Database Migration

**Important**: This must be run FIRST in Supabase.

1. Open Supabase SQL editor: https://app.supabase.com/project/YOUR-PROJECT-ID/sql/new
2. Copy entire contents of: `backend/rag-chatbot/RAG_MIGRATION.sql`
3. Paste into SQL editor
4. Click "Execute"
5. Verify no errors (you should see messages about creating extension, table, index, function)

**What this does:**
- Enables pgvector extension
- Creates `chatbot_documents` table with 384-dim vector column
- Creates HNSW index for fast vector search
- Creates `match_chatbot_documents()` RPC function

### Step 2: Environment Configuration

1. Update `.env` with your actual values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

GEMINI_API_KEY=your-google-api-key
GEMINI_MODEL=gemini-2.5-flash

PORT=3015
NODE_ENV=development
```

**Where to get these:**

- **SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY**
  - Go to: https://app.supabase.com/project/YOUR-PROJECT-ID/settings/api
  - Copy "Project URL"
  - Copy "Service Role Secret" (under "Project API keys")

- **GEMINI_API_KEY**
  - Go to: https://aistudio.google.com/app/apikey
  - Create new API key
  - Copy it to `.env`

### Step 3: Install Dependencies

```bash
cd backend/rag-chatbot
npm install
```

This installs:
- `@supabase/supabase-js` - Supabase client
- `@huggingface/transformers` - MiniLM embeddings
- `express` - Web framework
- `dotenv` - Environment loading

**First time setup note**: The first run of embedding generation will download ~100MB model from HuggingFace. This is cached locally in `~/.cache/huggingface/`.

### Step 4: Index Restaurants & Menu Items

```bash
npm run rag:index
```

This script:
1. ✅ Fetches all restaurants from `restaurants` table
2. ✅ Generates semantic documents for each
3. ✅ Creates 384-dim embeddings
4. ✅ Inserts into `chatbot_documents` table (upserts to avoid duplicates)
5. ✅ Fetches all menu items (joined with restaurants)
6. ✅ Generates semantic documents for each
7. ✅ Creates embeddings
8. ✅ Inserts into `chatbot_documents` table

**Expected output:**
```
🏪 Indexing restaurants...
📊 Found 5 restaurants to index
✅ Restaurant: Paradise Restaurant
✅ Restaurant: Bawarchi...
🎉 Successfully indexed 5 restaurants

🍕 Indexing menu items...
📊 Found 42 menu items to index
✅ Menu Item: Chicken Biryani @ Paradise Restaurant
...
🎉 Successfully indexed 42 menu items

✅ Indexing Complete
🏪 Restaurants indexed: 5
🍕 Menu items indexed: 42
📊 Total documents: 47
```

**Safe to run multiple times**: Uses UNIQUE constraint to avoid duplicates.

### Step 5: Start the Server

```bash
npm start
```

Expected output:
```
╔════════════════════════════════════════════════════════════════════════════╗
║               🤖 RAG CHATBOT SERVICE Started on 3015                       ║
║         Answering questions about restaurants and food items               ║
║                                                                            ║
║ Available endpoints:                                                       ║
║   GET  /health         - Health status                                    ║
║   GET  /               - Service information                              ║
║   POST /api/rag/chat   - Chat endpoint                                    ║
...
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## 🧪 Testing the System

### Test 1: Health Check
```bash
curl http://localhost:3015/health
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "rag-chatbot",
  "uptime": 12.345
}
```

### Test 2: Service Info
```bash
curl http://localhost:3015/
```

**Expected response:**
```json
{
  "service": "rag-chatbot",
  "version": "1.0.0",
  "description": "RAG-based food and restaurant chatbot...",
  "endpoints": [...]
}
```

### Test 3: Chat - Simple Query
```bash
curl -X POST http://localhost:3015/api/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me chicken biryani"}'
```

**Expected response:**
```json
{
  "success": true,
  "message": "I found several chicken biryani options for you...",
  "results": [
    {
      "type": "menu_item",
      "menu_item_id": 101,
      "restaurant_id": 10,
      "restaurant_name": "Paradise Restaurant",
      "food_name": "Chicken Biryani",
      "price": 250,
      "category": "Biryani",
      "is_available": true,
      "is_open": true
    }
  ],
  "metadata": {
    "query": "Show me chicken biryani",
    "documents_retrieved": 8,
    "results_count": 1
  }
}
```

### Test 4: Chat - Restaurant Query
```bash
curl -X POST http://localhost:3015/api/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Which restaurants are open?"}'
```

### Test 5: Chat - Price Filter Query
```bash
curl -X POST http://localhost:3015/api/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Find vegetarian food under 300"}'
```

---

## 🔍 How The System Works (Data Flow)

### Example Query: "Show me chicken biryani"

```
1. USER SENDS QUERY
   Request: POST /api/rag/chat
   Body: { "message": "Show me chicken biryani" }

2. EMBEDDING GENERATION
   Text: "Show me chicken biryani"
   Model: Xenova/all-MiniLM-L6-v2
   Output: [0.12, -0.34, 0.89, ..., 0.05] (384 dimensions)

3. VECTOR SEARCH
   Input: 384-dim embedding
   Database: Supabase pgvector
   Index: HNSW (cosine distance)
   Output: Top-10 most similar documents
   
   Results might include:
   - Chicken Biryani @ Paradise Restaurant
   - Chicken Dum Biryani @ Bawarchi
   - Chicken Biryani @ Restaurant X
   - Similar items...

4. STRUCTURED FILTERING
   (Optional, if LLM detects intent)
   Example: "under 300" → filter by price <= 300

5. SOURCE RECORD VERIFICATION
   For each retrieved document:
   - Fetch restaurant record
   - Fetch menu item record
   - Verify availability status
   - Ensure restaurant is open

6. CONTEXT CONSTRUCTION
   Build human-readable context for Gemini:
   
   "Retrieved Context:
   
   1. [MENU_ITEM] (Relevance: 98.2%)
   Food: Chicken Biryani
   Restaurant: Paradise Restaurant
   ...
   
   2. [MENU_ITEM] (Relevance: 97.5%)
   Food: Chicken Dum Biryani
   ..."

7. GEMINI GENERATION
   Input: Context + "Show me chicken biryani"
   System instruction: RAG discipline rules
   Output: "I found several chicken biryani options for you..."

8. RESPONSE TO USER
   Success: true
   Message: Generated response
   Results: Structured data for frontend
   Metadata: Query info, doc count, etc.
```

---

## 📊 Database Schema

### chatbot_documents Table
```sql
id              BIGINT PRIMARY KEY
source_type     VARCHAR(50)      -- 'restaurant' or 'menu_item'
source_id       BIGINT           -- Reference to restaurants.id or menu_items.id
content         TEXT             -- Semantic document
embedding       vector(384)      -- MiniLM embedding
metadata        JSONB            -- Structured data
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Indexes
- `idx_chatbot_documents_embedding_idx` - HNSW on embedding (vector_cosine_ops)
- `idx_chatbot_documents_source` - B-tree on (source_type, source_id)
- `idx_chatbot_documents_updated` - B-tree on updated_at DESC

### RPC Function
```sql
match_chatbot_documents(
  query_embedding vector(384),
  match_count INT DEFAULT 10
)
```
Returns: id, source_type, source_id, content, metadata, similarity

---

## 🛠️ Troubleshooting

### Issue: "Cannot find module '@huggingface/transformers'"

**Solution:**
```bash
cd backend/rag-chatbot
npm install
```

### Issue: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"

**Solution:**
1. Check `.env` file exists
2. Verify values are not empty
3. Ensure you're using Service Role Key, not anon key
4. No quotes around values in `.env`

Example `.env`:
```env
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...very-long-key...
```

### Issue: "No such table: chatbot_documents"

**Solution:**
1. Run RAG_MIGRATION.sql in Supabase SQL editor
2. Verify no SQL errors
3. Check table exists: SELECT * FROM chatbot_documents LIMIT 1;

### Issue: "Failed to fetch restaurants" during indexing

**Solution:**
1. Verify restaurants table exists
2. Check restaurants table has data
3. Verify Supabase connection with:
   ```bash
   curl https://your-project.supabase.co/rest/v1/restaurants -H "Authorization: Bearer your-service-key"
   ```

### Issue: "Model loading takes forever" or fails

**Solution:**
- First run downloads ~100MB model (normal, only happens once)
- Requires internet connection
- Model cached in `~/.cache/huggingface/`
- Try deleting cache and retrying:
  ```bash
  rm -rf ~/.cache/huggingface/
  npm run rag:index
  ```

### Issue: "Gemini API error 401"

**Solution:**
1. Verify GEMINI_API_KEY is correct
2. Check API key is active: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
3. Verify no typos in `.env`
4. Try creating a new API key

### Issue: "Vector search returns no results"

**Solution:**
1. Check documents were indexed:
   ```sql
   SELECT COUNT(*) FROM chatbot_documents;
   ```
   Should show > 0 results

2. Verify embeddings exist:
   ```sql
   SELECT COUNT(*) FROM chatbot_documents WHERE embedding IS NOT NULL;
   ```
   Should equal total documents

3. Re-index if needed:
   ```bash
   npm run rag:index
   ```

---

## 🔐 Security Notes

### Sensitive Data NOT Included
- Email addresses
- Password hashes
- Phone numbers
- API keys in documents

### Protected Data
- All embeddings stored in pgvector (encrypted in transit)
- Service Role Key only used on backend
- API keys never exposed to frontend
- Metadata cleaned before exposure

---

## 📈 Performance Notes

### Embedding Generation
- First load: ~5-10 seconds (model download)
- Subsequent queries: ~100-200ms per query
- Batch indexing: ~500ms per document

### Vector Search
- HNSW index: ~5-10ms for top-10 results
- Cosine distance: Fast with normalized embeddings

### Gemini LLM
- Response time: ~1-3 seconds (API dependent)
- Tokens: ~200-300 average response

### Total Query Time
- Full pipeline: ~2-5 seconds
- Network dependent

---

## 🚦 Next Steps After Deployment

### Verify Everything Works
1. ✅ npm install succeeds
2. ✅ npm run rag:index shows positive results
3. ✅ npm start server starts without errors
4. ✅ curl health check returns status ok
5. ✅ POST /api/rag/chat returns valid responses

### Monitor in Production
- Check logs for embedding failures
- Monitor Gemini API quota
- Track vector search latency
- Verify response relevance

### Future Enhancements (Not Yet Implemented)
- Kafka event sync for real-time updates
- Redis caching for common queries
- Chat history and conversation memory
- Advanced filtering and sorting
- User personalization

---

## 📚 Architecture Files

### Services Layer
- **embedding.service.js** - MiniLM embeddings
  - `generateEmbedding(text)` - Single embedding
  - `generateEmbeddingsBatch(texts)` - Batch processing

- **document-generation.service.js** - Document creation
  - `generateRestaurantDocument(restaurant)` - Restaurant RAG doc
  - `generateMenuItemDocument(menuItem, restaurant)` - Menu item RAG doc

- **retrieval.service.js** - Vector search
  - `retrieveRelevantDocuments(embedding, options)` - Vector similarity search
  - `fetchSourceRecord(sourceType, sourceId)` - Get authoritative record

- **gemini.service.js** - LLM integration
  - `generateResponse(query, documents)` - Generate natural language response

- **chat.service.js** - Orchestration
  - `processUserMessage(message)` - Full RAG pipeline

### Controllers & Routes
- **chat.controller.js** - HTTP handler for POST /api/rag/chat
- **rag.js** - Express router

### Database
- **db.js** - Supabase client initialization
- **RAG_MIGRATION.sql** - SQL schema and functions

### Server
- **server.js** - Express app, middleware, error handling

### Scripts
- **index-documents.js** - Idempotent indexing (npm run rag:index)

---

## ✨ Summary

You now have a production-ready RAG chatbot system that:

✅ Embeds restaurant/menu data locally (MiniLM)
✅ Stores embeddings in Supabase pgvector
✅ Performs fast vector similarity search
✅ Verifies all data against source of truth (PostgreSQL)
✅ Generates responses with Google Gemini
✅ Never hallucinate database information
✅ Handles natural language food queries
✅ Returns structured results for frontend

**To start using:**
```bash
cd backend/rag-chatbot
npm install
npm run rag:index
npm start
```

**To test:**
```bash
curl -X POST http://localhost:3015/api/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me chicken biryani"}'
```

Enjoy your RAG chatbot! 🤖
