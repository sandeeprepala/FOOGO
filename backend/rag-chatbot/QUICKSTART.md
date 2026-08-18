# 🚀 RAG Chatbot - Quick Start (5 Minutes)

Complete these steps to have the RAG chatbot up and running.

## 📋 Prerequisites

- Node.js 18+
- npm
- Supabase account with database access
- Google Gemini API key
- Existing restaurants/menu_items data in Supabase

## ⚡ Quick Start Steps

### 1. Database Migration (1 min)
```bash
# Open Supabase SQL editor:
# https://app.supabase.com/project/YOUR-PROJECT-ID/sql/new

# Copy & run this file in SQL editor:
# backend/rag-chatbot/RAG_MIGRATION.sql
```

### 2. Configure Environment (2 min)
```bash
# Edit: backend/rag-chatbot/.env

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
GEMINI_API_KEY=your-gemini-key-here
GEMINI_MODEL=gemini-2.5-flash
PORT=3015
NODE_ENV=development
```

### 3. Install & Setup (1 min)
```bash
cd backend/rag-chatbot
npm install
```

### 4. Index Documents (1 min)
```bash
npm run rag:index
```

Expected output:
```
🏪 Indexing restaurants...
📊 Found 5 restaurants to index
✅ Restaurant: Paradise Restaurant
...
🎉 Successfully indexed 5 restaurants

🍕 Indexing menu items...
...
🎉 Successfully indexed 42 menu items
```

### 5. Start Server (30 sec)
```bash
npm start
```

Expected output:
```
🤖 RAG CHATBOT SERVICE Started on 3015
```

## ✅ Test It Works (30 sec)

### Test 1: Health Check
```bash
curl http://localhost:3015/health
```

### Test 2: Chat
```bash
curl -X POST http://localhost:3015/api/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me chicken biryani"}'
```

## 🎉 You're Done!

The chatbot is running and ready to answer questions about restaurants and food items.

## 🔗 Integration Points

### API Endpoint
```
POST http://localhost:3015/api/rag/chat
```

### Request Format
```json
{
  "message": "Your question here"
}
```

### Response Format
```json
{
  "success": true,
  "message": "AI-generated response",
  "results": [
    {
      "type": "menu_item",
      "restaurant_name": "Paradise Restaurant",
      "food_name": "Chicken Biryani",
      "price": 250
    }
  ]
}
```

## 📝 Example Queries

```
"Show me chicken biryani"
"Which restaurants are open?"
"Find vegetarian food under 300"
"Where can I get good biryani?"
"Find restaurants serving Chinese food"
"Show me pizza"
```

## 🛠️ Common Issues

### "Cannot find module '@huggingface/transformers'"
```bash
npm install
```

### "Missing SUPABASE_URL"
- Check `.env` file has correct values
- No quotes around values

### "No such table: chatbot_documents"
- Run RAG_MIGRATION.sql in Supabase SQL editor

### "Failed to fetch restaurants"
- Verify restaurants table has data
- Check Supabase credentials

---

## 📚 More Information

- Full guide: `IMPLEMENTATION_GUIDE.md`
- Architecture: `README.md`
- SQL schema: `RAG_MIGRATION.sql`

---

**Need help?** Check IMPLEMENTATION_GUIDE.md for detailed troubleshooting.
