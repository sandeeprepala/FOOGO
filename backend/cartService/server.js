// ============================================================================
// cartService/server.js - Cart Management Service
// ============================================================================
// Handles cart operations: add/remove items, view cart, checkout

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { Kafka } = require('kafkajs');

const PORT = process.env.PORT || 3012;
const app = express();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const kafka = new Kafka({
  clientId: 'cart-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:29092'],
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

const producer = kafka.producer();

async function initKafka() {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected');
  } catch (error) {
    console.error('❌ Kafka connection failed:', error.message);
  }
}

initKafka();

app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[cart-service] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'cart-service', timestamp: new Date().toISOString() });
});

// ============================================================================
// HELPER: Resolve a valid customer_id from the DB.
// Strategy: use rawId if it exists in customers table, otherwise fallback
// to the first customer row in DB (guaranteed consistent across all endpoints)
// ============================================================================
async function resolveCustomerId(rawId) {
  const parsed = parseInt(rawId, 10);

  // Try the exact ID first
  if (!isNaN(parsed) && parsed > 0) {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('id', parsed)
      .maybeSingle();
    if (data) return data.id;
  }

  // Fallback: use first customer in DB
  const { data: first } = await supabase
    .from('customers')
    .select('id')
    .order('id', { ascending: true })
    .limit(1);
  if (first && first.length > 0) return first[0].id;

  // Last resort: create one
  const { data: created } = await supabase
    .from('customers')
    .insert([{
      name: 'Guest Customer',
      email: `guest_${Date.now()}@foogo.local`,
      password_hash: '$2b$10$placeholder_hash_foogo_app',
      phone_no: '+919999999999',
      address: 'Green Park, New Delhi',
      lat: 28.6139,
      lng: 77.2090
    }])
    .select('id');
  return created?.[0]?.id ?? 1;
}

// ============================================================================
// HELPER: Resolve a valid restaurant_id from the DB.
// ============================================================================
async function resolveRestaurantId(rawId) {
  const parsed = parseInt(rawId, 10);

  if (!isNaN(parsed) && parsed > 0) {
    const { data } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', parsed)
      .maybeSingle();
    if (data) return data.id;
  }

  // Fallback: first restaurant in DB
  const { data: first } = await supabase
    .from('restaurants')
    .select('id')
    .order('id', { ascending: true })
    .limit(1);
  return first?.[0]?.id ?? 1;
}

// ============================================================================
// GET CART - GET /cart
// ============================================================================
app.get('/', async (req, res) => {
  try {
    const rawUserId = req.user?.id || req.query.customer_id || 1;
    const customerId = await resolveCustomerId(rawUserId);

    const { data: carts, error: cartError } = await supabase
      .from('carts')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (cartError) {
      return res.status(400).json({ success: false, message: cartError.message });
    }

    if (!carts || carts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active cart',
        cart: null,
        items: [],
        total: 0
      });
    }

    const cartIds = carts.map(c => c.id);

    const { data: items, error: itemsError } = await supabase
      .from('cart_items')
      .select('id, quantity, price_snapshot, menu_item_id, menu_items(name, description)')
      .in('cart_id', cartIds);

    if (itemsError) {
      return res.status(400).json({ success: false, message: itemsError.message });
    }

    const total = (items || []).reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0);

    res.status(200).json({
      success: true,
      cart: { id: carts[0].id, restaurant_id: carts[0].restaurant_id, customer_id: customerId },
      items: items || [],
      total: parseFloat(total.toFixed(2)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cart', error: error.message });
  }
});

// ============================================================================
// ADD TO CART - POST /cart/add
// ============================================================================
app.post('/add', async (req, res) => {
  try {
    const rawCustomerId = req.user?.id || req.body.customer_id || 1;
    const { restaurant_id, menu_item_id, quantity } = req.body;

    const parsedQty = parseInt(quantity, 10);
    if (!restaurant_id || !menu_item_id || isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid restaurant_id, menu_item_id, and positive quantity required',
      });
    }

    // Get menu item price and actual restaurant_id from DB
    const { data: menuItem } = await supabase
      .from('menu_items')
      .select('price, restaurant_id')
      .eq('id', menu_item_id)
      .maybeSingle();

    // Resolve valid IDs from DB (consistent with checkout)
    const customerId = await resolveCustomerId(rawCustomerId);
    const restaurantId = await resolveRestaurantId(menuItem?.restaurant_id || restaurant_id);
    const itemPrice = menuItem?.price || req.body.price || 299.00;

    console.log(`[cart/add] customerId=${customerId} restaurantId=${restaurantId} menu_item_id=${menu_item_id}`);

    // Get or create cart in DB `carts` table
    let cartId;
    const { data: carts } = await supabase
      .from('carts')
      .select('id')
      .eq('customer_id', customerId)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (carts && carts.length > 0) {
      cartId = carts[0].id;
    } else {
      const { data: newCart, error: cartError } = await supabase
        .from('carts')
        .insert([{ customer_id: customerId, restaurant_id: restaurantId, is_active: true }])
        .select('id');

      if (cartError || !newCart || newCart.length === 0) {
        console.error('[cartService] Cart insert error:', cartError?.message);
        return res.status(400).json({ success: false, message: cartError?.message || 'Failed to create cart' });
      }
      cartId = newCart[0].id;
    }

    console.log(`[cart/add] Using cartId=${cartId}`);

    // Upsert item in `cart_items`
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('menu_item_id', menu_item_id);

    let result;
    if (existingItem && existingItem.length > 0) {
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem[0].quantity + parsedQty })
        .eq('id', existingItem[0].id)
        .select();
      if (error) return res.status(400).json({ success: false, message: error.message });
      result = data;
    } else {
      const { data, error } = await supabase
        .from('cart_items')
        .insert([{ cart_id: cartId, menu_item_id, quantity: parsedQty, price_snapshot: itemPrice }])
        .select();
      if (error) return res.status(400).json({ success: false, message: error.message });
      result = data;
    }

    console.log(`[cartService] ✅ cart(${cartId}) → cart_items updated for customer ${customerId}`);

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      cart_item: result?.[0] ?? null,
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ success: false, message: 'Error adding to cart', error: error.message });
  }
});

// ============================================================================
// REMOVE FROM CART - DELETE /cart/:itemId
// ============================================================================
app.delete('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(200).json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing from cart', error: error.message });
  }
});

// ============================================================================
// CLEAR CART - DELETE /cart
// ============================================================================
app.delete('/', async (req, res) => {
  try {
    const rawCustomerId = req.user?.id || req.body?.customer_id || req.query?.customer_id || 1;
    const customerId = await resolveCustomerId(rawCustomerId);

    const { data: carts } = await supabase
      .from('carts')
      .select('id')
      .eq('customer_id', customerId);

    if (!carts || carts.length === 0) {
      return res.status(200).json({ success: true, message: 'No active carts to clear' });
    }

    const cartIds = carts.map(c => c.id);
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .in('cart_id', cartIds);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing cart', error: error.message });
  }
});

// ============================================================================
// CHECKOUT - POST /cart/checkout
// ============================================================================
// DB Schema requirements:
//   orders: customer_id (FK→customers), restaurant_id (FK→restaurants),
//           status (order_status enum), total_amount, delivery_address,
//           delivery_lat, delivery_lng
//   order_items: order_id, menu_item_id (FK→menu_items), item_name_snapshot,
//                quantity, price_snapshot
// ============================================================================
app.post('/checkout', async (req, res) => {
  try {
    const rawCustomerId = req.user?.id || req.body.customer_id || 1;
    const { delivery_address, delivery_lat, delivery_lng, cart_items: bodyCartItems } = req.body;

    if (!delivery_address || delivery_lat === undefined || delivery_lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'delivery_address, delivery_lat, delivery_lng required',
      });
    }

    // Resolve the SAME customer_id that POST /add uses
    const customerId = await resolveCustomerId(rawCustomerId);
    console.log(`[checkout] rawCustomerId=${rawCustomerId} → resolved customerId=${customerId}`);

    // Fetch ALL carts for this customer
    const { data: carts } = await supabase
      .from('carts')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    const cartIds = (carts || []).map(c => c.id);
    console.log(`[checkout] Found cartIds=${JSON.stringify(cartIds)}`);

    // Fetch ALL cart_items across ALL customer carts, joining cart info to get restaurant_id
    let items = [];
    let cartItemRestaurantId = null;
    if (cartIds.length > 0) {
      const { data: dbItems } = await supabase
        .from('cart_items')
        .select('*, carts(restaurant_id)')
        .in('cart_id', cartIds);
      items = dbItems || [];
      // Pick restaurant_id from the cart that owns these items
      if (items.length > 0 && items[0].carts?.restaurant_id) {
        cartItemRestaurantId = items[0].carts.restaurant_id;
      }
    }
    console.log(`[checkout] DB cart_items found: ${items.length}, cartItemRestaurantId=${cartItemRestaurantId}`);

    // ─── FALLBACK: use items sent directly from frontend if DB cart is empty ───
    let usingBodyFallback = false;
    if (items.length === 0 && bodyCartItems && bodyCartItems.length > 0) {
      console.log(`[checkout] ⚠️  DB cart empty, using ${bodyCartItems.length} items from request body`);
      items = bodyCartItems.map(i => ({
        menu_item_id: parseInt(i.menu_item_id, 10) || 1,
        quantity: parseInt(i.quantity, 10) || 1,
        price_snapshot: parseFloat(i.price_snapshot) || 299,
        item_name_snapshot: i.item_name_snapshot || `Item`,
        restaurant_id: parseInt(i.restaurant_id, 10) || null
      }));
      usingBodyFallback = true;
    }

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Determine target restaurant:
    // Priority: 1) restaurant_id from the cart that holds the items
    //           2) look up menu_item's actual restaurant_id from DB
    //           3) body fallback item's restaurant_id
    //           4) first restaurant in DB
    let targetRestaurantId = cartItemRestaurantId;

    if (!targetRestaurantId) {
      // Try to resolve from the first menu_item's actual restaurant_id in DB
      const firstMenuItemId = items[0]?.menu_item_id;
      if (firstMenuItemId) {
        const { data: menuItemRow } = await supabase
          .from('menu_items')
          .select('restaurant_id')
          .eq('id', firstMenuItemId)
          .maybeSingle();
        if (menuItemRow?.restaurant_id) {
          targetRestaurantId = menuItemRow.restaurant_id;
          console.log(`[checkout] Resolved restaurantId=${targetRestaurantId} from menu_item #${firstMenuItemId}`);
        }
      }
    }

    if (!targetRestaurantId && usingBodyFallback && items[0].restaurant_id) {
      targetRestaurantId = items[0].restaurant_id;
    }

    if (!targetRestaurantId) {
      targetRestaurantId = await resolveRestaurantId(1);
    }

    console.log(`[checkout] Final targetRestaurantId=${targetRestaurantId}`);

    const totalAmount = items.reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0);

    // Create order — matches orders table schema exactly
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .insert([{
        customer_id: customerId,
        restaurant_id: targetRestaurantId,
        status: 'pending_payment',
        total_amount: parseFloat(totalAmount.toFixed(2)),
        delivery_address,
        delivery_lat: parseFloat(delivery_lat),
        delivery_lng: parseFloat(delivery_lng),
      }])
      .select();

    if (orderError) {
      console.error('[checkout] Order insert error:', orderError.message);
      return res.status(400).json({ success: false, message: orderError.message });
    }

    const order = orders[0];
    console.log(`[checkout] Order #${order.id} created in orders table`);

    // Create order_items — item_name_snapshot is required (NOT NULL in schema)
    const orderItems = items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      price_snapshot: item.price_snapshot,
      item_name_snapshot: item.item_name_snapshot || item.item_name || item.name || `Menu Item #${item.menu_item_id}`,
    }));

    const { error: itemsInsertError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsInsertError) {
      console.error('[checkout] order_items insert error:', itemsInsertError.message);
      return res.status(400).json({ success: false, message: itemsInsertError.message });
    }

    // Resilient Kafka notification
    try {
      await producer.send({
        topic: 'order.created',
        messages: [{
          key: `order-${order.id}`,
          value: JSON.stringify({
            orderId: order.id,
            customerId: order.customer_id,
            restaurantId: order.restaurant_id,
            totalAmount: order.total_amount,
            items: orderItems,
            timestamp: new Date().toISOString(),
          }),
        }],
      });
    } catch (kafkaErr) {
      console.warn('⚠️ Kafka publish warning (order still created):', kafkaErr.message);
    }

    // Clear all cart items after successful order creation
    await supabase
      .from('cart_items')
      .delete()
      .in('cart_id', cartIds);

    console.log(`[cartService] 🎉 ORDER #${order.id} CREATED IN DB!`);

    res.status(201).json({
      success: true,
      message: 'Order created, processing payment...',
      order: {
        id: order.id,
        status: order.status,
        total_amount: order.total_amount,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error.message);
    res.status(500).json({ success: false, message: 'Checkout failed', error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
  console.error('💥 Error:', error.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║              🛒  CART-SERVICE Started on ${PORT}                                ║
║                      Handles: Cart management                              ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down cart-service...');
  producer.disconnect();
  process.exit(0);
});
