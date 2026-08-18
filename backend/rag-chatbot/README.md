# 🤖 RAG-Based Food & Restaurant Chatbot

A retrieval-augmented generation (RAG) chatbot for the FOOGO food delivery platform. Uses semantic search with embeddings and Google Gemini LLM to answer natural language questions about restaurants and menu items.

## 🏗️ Architecture

```
User Query
    ↓
MiniLM Embedding (384 dimensions)
    ↓
Supabase pgvector Similarity Search
    ↓
Top-K Relevant Documents
    ↓
PostgreSQL Source Records (Authority)
    ↓
RAG Context Construction
    ↓
Google Gemini 2.5 Flash
    ↓
Natural Language Response
```

## 📋 Prerequisites

### Database Setup
1. **PostgreSQL with pgvector** (via Supabase)
2. Run the SQL migration: `RAG_MIGRATION.sql`

### Environment Variables
Create `.env` with:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-google-api-key
GEMINI_MODEL=gemini-2.5-flash
PORT=3015
NODE_ENV=development
```

### Dependencies
- Node.js 18+
- npm packages: `@supabase/supabase-js`, `@huggingface/transformers`, `express`, `dotenv`

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend/rag-chatbot
npm install
```

### 2. Run Database Migration
Run `RAG_MIGRATION.sql` in Supabase SQL editor:
- Creates `chatbot_documents` table
- Creates HNSW index for fast vector search
- Creates `match_chatbot_documents()` RPC function

### 3. Index Restaurants & Menu Items
```bash
npm run rag:index
```
This script:
- Fetches all restaurants from the database
- Generates semantic documents for each
- Creates 384-dimensional MiniLM embeddings
- Inserts into `chatbot_documents` table
- Repeats for all menu items
- Is fully idempotent (safe to run multiple times)

### 4. Start the Service
```bash
npm start
```
Server runs on `http://localhost:3015`

## 📚 API Endpoints

### Health Check
```bash
GET /health
```
Response: `{ "status": "ok", "service": "rag-chatbot", "uptime": 123.45 }`

### Service Info
```bash
GET /
```
Response: Service information and available endpoints

### Chat with Chatbot
```bash
POST /api/rag/chat
Content-Type: application/json

{
  "message": "Show me chicken biryani"
}
```

**Response:**
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

## 🔍 Supported Query Types

The chatbot handles natural language queries about:

- **Food searches**: "Show me chicken biryani", "Find pizza"
- **Restaurant searches**: "Which restaurants are open?", "Show me Paradise"
- **Cuisine searches**: "Find Chinese food", "Show me vegetarian options"
- **Price filters**: "Find biryani under 300", "Chicken dishes under ₹250"
- **Availability**: "What's available now?", "Open restaurants with Chinese food"
- **Location**: "Restaurants near Vijayawada", "Where can I get biryani?"

## 📖 Documents & Embeddings

### Restaurant Documents
One document per restaurant:
```
Restaurant Name: Paradise Restaurant
Cuisine: Indian, Biryani
Address: MG Road, Vijayawada
Currently Open: Yes
```

**Metadata:**
```json
{
  "restaurant_id": 10,
  "restaurant_name": "Paradise Restaurant",
  "cuisine_type": "Indian",
  "is_open": true,
  "address": "MG Road, Vijayawada"
}
```

### Menu Item Documents
One document per menu item:
```
Food: Chicken Biryani
Restaurant: Paradise Restaurant
Cuisine: Indian
Description: Spicy chicken biryani served with raita
Category: Biryani
Price: ₹250
Restaurant Address: MG Road, Vijayawada
Restaurant Currently Open: Yes
Food Currently Available: Yes
```

**Metadata:**
```json
{
  "menu_item_id": 101,
  "restaurant_id": 10,
  "restaurant_name": "Paradise Restaurant",
  "price": 250,
  "category": "Biryani",
  "is_available": true,
  "is_open": true,
  "cuisine_type": "Indian"
}
```

## 🧠 Embedding Model

- **Model**: `Xenova/all-MiniLM-L6-v2`
- **Dimensions**: 384
- **Run locally**: Using `@huggingface/transformers` (no remote API)
- **Normalized**: Yes (cosine distance optimization)

## 🔐 Data Privacy

### Never Included in Documents
- Email addresses
- Password hashes
- Phone numbers

### Vector Search Index
- All embeddings stored encrypted in pgvector
- Only used for semantic similarity
- Not exposed to frontend

## 🛡️ RAG Discipline

The chatbot enforces strict RAG rules:

1. ✅ Answers ONLY using retrieved database context
2. ❌ Never invents restaurants, food items, prices
3. ✅ Reports when no matching results found
4. ✅ Always cites source information
5. ❌ Doesn't expose embeddings, IDs, or implementation details

## 🔄 Data Flow

```
1. User Query
   ↓
2. Generate 384-dim MiniLM embedding
   ↓
3. Vector search in Supabase pgvector
   ↓
4. Retrieve top-10 similar documents
   ↓
5. Apply structured filters (price, availability, etc.)
   ↓
6. Fetch authoritative PostgreSQL records
   ↓
7. Build RAG context
   ↓
8. Send to Gemini LLM with system instructions
   ↓
9. Gemini generates natural language response
   ↓
10. Return response + structured results to user
```

## 📊 Database Schema

### chatbot_documents Table
```sql
CREATE TABLE chatbot_documents (
    id BIGINT PRIMARY KEY,
    source_type VARCHAR(50),        -- 'restaurant' or 'menu_item'
    source_id BIGINT,               -- ID from restaurants or menu_items table
    content TEXT,                   -- The semantic document
    embedding vector(384),          -- MiniLM embedding
    metadata JSONB,                 -- Structured data for filtering
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(source_type, source_id)
);
```

### Indexes
- HNSW index on `embedding` (vector_cosine_ops)
- B-tree indexes on `source_type`, `source_id`, `updated_at`

### RPC Function
```sql
match_chatbot_documents(
    query_embedding vector(384),
    match_count INT DEFAULT 10
)
```
Returns top-K similar documents with similarity scores.

## 🚨 Troubleshooting

### "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
- Check `.env` file
- Verify values are not empty
- Service key (not anon key) is required

### "Failed to fetch restaurants" during indexing
- Run `RAG_MIGRATION.sql` first
- Verify `restaurants` table exists
- Check Supabase connection

### "No embedding model found"
- First run downloads ~100MB model from HuggingFace
- Requires internet connection
- Model is cached locally in `~/.cache/huggingface/`

### "Vector search returned no results"
- Run indexing: `npm run rag:index`
- Verify documents are in `chatbot_documents` table
- Check embedding column is not NULL

### Gemini API errors
- Verify `GEMINI_API_KEY` is valid
- Check quota at https://console.cloud.google.com/
- Ensure model name is correct (`gemini-2.5-flash`)

## 🔮 Future Enhancements

Not yet implemented (follow-up phases):

- ✋ Kafka event sync for real-time updates
- ✋ Redis caching for frequently asked queries
- ✋ Chat history and conversation memory
- ✋ Advanced filtering (distance, ratings, etc.)
- ✋ Voice input/output
- ✋ User personalization
- ✋ Recommendation systems

## 🎯 Current Scope

Implemented:
- ✅ Restaurant & menu item document generation
- ✅ MiniLM local embeddings (384 dimensions)
- ✅ Supabase pgvector storage
- ✅ HNSW vector search
- ✅ PostgreSQL source of truth verification
- ✅ Gemini LLM response generation
- ✅ RAG context construction
- ✅ Chat endpoint (`POST /api/rag/chat`)
- ✅ Idempotent indexing script

## 📝 Example Usage

### Query: Find chicken biryani
```bash
curl -X POST http://localhost:3015/api/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me chicken biryani"}'
```

### Query: Find vegetarian food under ₹300
```bash
curl -X POST http://localhost:3015/api/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Find vegetarian food under 300"}'
```

### Query: Which restaurants serve biryani?
```bash
curl -X POST http://localhost:3015/api/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Which restaurants serve biryani?"}'
```

## 📞 Support

For issues or questions:
1. Check logs in development console
2. Verify all `.env` variables
3. Ensure database migrations are applied
4. Run indexing script to refresh embeddings

---

**Built for FOOGO - Microservices Food Delivery Platform**
