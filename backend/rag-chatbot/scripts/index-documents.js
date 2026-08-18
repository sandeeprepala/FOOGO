// ============================================================================
// rag-chatbot/scripts/index-documents.js - RAG Document Indexing
// ============================================================================
// Idempotent script to index all restaurants and menu items as RAG documents
// Generates embeddings and stores them in chatbot_documents table
// Run with: npm run rag:index
// ============================================================================

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = require('../db');
const {
  generateRestaurantDocument,
  generateMenuItemDocument,
} = require('../services/document-generation.service');
const {
  generateEmbedding,
  generateEmbeddingsBatch,
} = require('../services/embedding.service');

let indexedRestaurants = 0;
let indexedMenuItems = 0;
let failedDocuments = [];

/**
 * Index all restaurants in the database
 */
async function indexRestaurants() {
  console.log('\n🏪 Indexing restaurants...');

  try {
    // Fetch all restaurants (excluding sensitive fields)
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, name, cuisine_type, address, is_open, created_at, updated_at');

    if (error) {
      throw new Error(`Failed to fetch restaurants: ${error.message}`);
    }

    if (!restaurants || restaurants.length === 0) {
      console.log('⚠️  No restaurants found in database');
      return;
    }

    console.log(`📊 Found ${restaurants.length} restaurants to index`);

    // Process restaurants in batches for better performance
    const batchSize = 5;
    for (let i = 0; i < restaurants.length; i += batchSize) {
      const batch = restaurants.slice(i, i + batchSize);

      // Generate documents and embeddings for this batch
      const documentsToInsert = [];

      for (const restaurant of batch) {
        try {
          const { content, metadata } = generateRestaurantDocument(restaurant);

          // Generate embedding
          const embedding = await generateEmbedding(content);

          documentsToInsert.push({
            source_type: 'restaurant',
            source_id: restaurant.id,
            content,
            embedding,
            metadata,
          });

          console.log(`✅ Restaurant: ${restaurant.name}`);
        } catch (docError) {
          console.error(`❌ Failed to process restaurant ${restaurant.id}:`, docError.message);
          failedDocuments.push({
            type: 'restaurant',
            id: restaurant.id,
            error: docError.message,
          });
        }
      }

      // Insert/upsert documents into chatbot_documents
      if (documentsToInsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('chatbot_documents')
          .upsert(documentsToInsert, {
            onConflict: 'source_type,source_id',
          });

        if (upsertError) {
          throw new Error(`Failed to upsert restaurant documents: ${upsertError.message}`);
        }

        indexedRestaurants += documentsToInsert.length;
      }
    }

    console.log(`🎉 Successfully indexed ${indexedRestaurants} restaurants`);
  } catch (error) {
    console.error('❌ Restaurant indexing failed:', error.message);
    throw error;
  }
}

/**
 * Index all menu items in the database
 */
async function indexMenuItems() {
  console.log('\n🍕 Indexing menu items...');

  try {
    // Fetch all menu items with their restaurants
    const { data: menuItems, error } = await supabase
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
        updated_at,
        restaurant:restaurant_id (
          id,
          name,
          cuisine_type,
          address,
          is_open
        )
        `
      );

    if (error) {
      throw new Error(`Failed to fetch menu items: ${error.message}`);
    }

    if (!menuItems || menuItems.length === 0) {
      console.log('⚠️  No menu items found in database');
      return;
    }

    console.log(`📊 Found ${menuItems.length} menu items to index`);

    // Process menu items in batches
    const batchSize = 5;
    for (let i = 0; i < menuItems.length; i += batchSize) {
      const batch = menuItems.slice(i, i + batchSize);

      // Generate documents for this batch
      const documentsToInsert = [];
      const texts = [];
      const itemsInBatch = [];

      for (const menuItem of batch) {
        try {
          const { content, metadata } = generateMenuItemDocument(
            menuItem,
            menuItem.restaurant
          );

          texts.push(content);
          itemsInBatch.push({ menuItem, content, metadata });

          console.log(`✅ Menu Item: ${menuItem.name} @ ${menuItem.restaurant.name}`);
        } catch (docError) {
          console.error(`❌ Failed to process menu item ${menuItem.id}:`, docError.message);
          failedDocuments.push({
            type: 'menu_item',
            id: menuItem.id,
            error: docError.message,
          });
        }
      }

      // Generate embeddings in batch (more efficient)
      if (texts.length > 0) {
        try {
          const embeddings = await generateEmbeddingsBatch(texts);

          for (let j = 0; j < itemsInBatch.length; j++) {
            const { menuItem, content, metadata } = itemsInBatch[j];
            documentsToInsert.push({
              source_type: 'menu_item',
              source_id: menuItem.id,
              content,
              embedding: embeddings[j],
              metadata,
            });
          }
        } catch (embError) {
          console.error(`❌ Batch embedding failed:`, embError.message);
          throw embError;
        }
      }

      // Insert/upsert documents
      if (documentsToInsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('chatbot_documents')
          .upsert(documentsToInsert, {
            onConflict: 'source_type,source_id',
          });

        if (upsertError) {
          throw new Error(`Failed to upsert menu item documents: ${upsertError.message}`);
        }

        indexedMenuItems += documentsToInsert.length;
      }
    }

    console.log(`🎉 Successfully indexed ${indexedMenuItems} menu items`);
  } catch (error) {
    console.error('❌ Menu item indexing failed:', error.message);
    throw error;
  }
}

/**
 * Main indexing function
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                   🤖 RAG Document Indexing Started                         ║
║          Preparing restaurants and menu items for vector search            ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);

  try {
    // Index restaurants first
    await indexRestaurants();

    // Then index menu items
    await indexMenuItems();

    // Print summary
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    ✅ Indexing Complete                                    ║
├════════════════════════════════════════════════════════════════════════════┤
║ 🏪 Restaurants indexed:     ${indexedRestaurants.toString().padEnd(40)}║
║ 🍕 Menu items indexed:      ${indexedMenuItems.toString().padEnd(40)}║
║ 📊 Total documents:         ${(indexedRestaurants + indexedMenuItems).toString().padEnd(40)}║
${
  failedDocuments.length > 0
    ? `║ ❌ Failed:                  ${failedDocuments.length.toString().padEnd(40)}║`
    : ''
}
╚════════════════════════════════════════════════════════════════════════════╝
    `);

    if (failedDocuments.length > 0) {
      console.log('Failed documents:');
      failedDocuments.forEach((doc) => {
        console.log(`  - ${doc.type}:${doc.id} - ${doc.error}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error(`
❌ INDEXING FAILED: ${error.message}

Please check:
1. Database migrations have been run (RAG_MIGRATION.sql)
2. SUPABASE_URL is set correctly
3. SUPABASE_SERVICE_ROLE_KEY is set correctly
4. Restaurants and menu_items tables exist and have data
    `);

    process.exit(1);
  }
}

// Run the indexing
main();
