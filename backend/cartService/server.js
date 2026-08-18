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
});

const producer = kafka.producer({ idempotent: true });

app.use(express.json());

// Kafka setup
(async () => {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected');
  } catch (error) {
    console.error('❌ Kafka connection failed:', error.message);
  }
})();

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'cart-service' });
});

// ============================================================================
// GET CART - GET /cart
// ============================================================================
/**
 * Get customer's current cart
 * Requires: req.user.id (set by gateway JWT verification)
 */
app.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.customer_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'customer_id or JWT user required',
      });
    }

    // Get customer's carts (most recent first, should only have one active)
    const { data: carts, error: cartError } = await supabase
      .from('carts')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (cartError) {
      return res.status(400).json({ success: false, message: cartError.message });
    }

    if (!carts || carts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active cart',
        cart: null,
        items: [],
      });
    }

    const cart = carts[0];

    // Get cart items with menu item details
    const { data: items, error: itemsError } = await supabase
      .from('cart_items')
      .select('id, quantity, price_snapshot, menu_item_id, menu_items(name, description)')
      .eq('cart_id', cart.id);

    if (itemsError) {
      return res.status(400).json({ success: false, message: itemsError.message });
    }

    const total = items.reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0);

    res.status(200).json({
      success: true,
      cart: { id: cart.id, restaurant_id: cart.restaurant_id, customer_id: cart.customer_id },
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
/**
 * Add item to cart
 * Body: { restaurant_id, menu_item_id, quantity }
 */
app.post('/add', async (req, res) => {
  try {
    const customerId = req.user?.id || req.body.customer_id;
    const { restaurant_id, menu_item_id, quantity } = req.body;

    if (!customerId || !restaurant_id || !menu_item_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'customer_id, restaurant_id, menu_item_id, quantity required',
      });
    }

    // Get or create cart for this customer & restaurant
    const { data: carts } = await supabase
      .from('carts')
      .select('id')
      .eq('customer_id', customerId)
      .eq('restaurant_id', restaurant_id)
      .limit(1);

    let cartId;

    if (carts && carts.length > 0) {
      cartId = carts[0].id;
    } else {
      // Create new cart
      const { data: newCart, error: cartError } = await supabase
        .from('carts')
        .insert([{ customer_id: customerId, restaurant_id }])
        .select();

      if (cartError) {
        return res.status(400).json({ success: false, message: cartError.message });
      }

      cartId = newCart[0].id;
    }

    // Get menu item price
    const { data: menuItem, error: menuError } = await supabase
      .from('menu_items')
      .select('price')
      .eq('id', menu_item_id)
      .single();

    if (menuError || !menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    // Add item to cart (or update if exists)
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('menu_item_id', menu_item_id);

    let result;

    if (existingItem && existingItem.length > 0) {
      // Update quantity
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem[0].quantity + parseInt(quantity) })
        .eq('id', existingItem[0].id)
        .select();

      result = data;
    } else {
      // Insert new item
      const { data, error } = await supabase
        .from('cart_items')
        .insert([
          {
            cart_id: cartId,
            menu_item_id,
            quantity: parseInt(quantity),
            price_snapshot: menuItem.price,
          },
        ])
        .select();

      result = data;
    }

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      cart_item: result[0],
    });
  } catch (error) {
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

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing from cart', error: error.message });
  }
});

// ============================================================================
// CLEAR CART - DELETE /cart
// ============================================================================
app.delete('/', async (req, res) => {
  try {
    const customerId = req.user?.id || req.body.customer_id;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'customer_id required' });
    }

    // Get cart
    const { data: carts } = await supabase
      .from('carts')
      .select('id')
      .eq('customer_id', customerId)
      .limit(1);

    if (!carts || carts.length === 0) {
      return res.status(404).json({ success: false, message: 'No cart found' });
    }

    // Delete all items in cart
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', carts[0].id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing cart', error: error.message });
  }
});

// ============================================================================
// CHECKOUT - POST /cart/checkout
// ============================================================================
/**
 * Convert cart to order
 * Triggers payment flow via Kafka
 */
app.post('/checkout', async (req, res) => {
  try {
    const customerId = req.user?.id || req.body.customer_id;
    const { delivery_address, delivery_lat, delivery_lng } = req.body;

    if (!customerId || !delivery_address || delivery_lat === undefined || delivery_lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'customer_id, delivery_address, delivery_lat, delivery_lng required',
      });
    }

    // Get customer's cart
    const { data: carts } = await supabase
      .from('carts')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!carts || carts.length === 0) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const cart = carts[0];

    // Get cart items
    const { data: items, error: itemsError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.id);

    if (itemsError || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Calculate total
    const totalAmount = items.reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0);

    // Create order
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          customer_id: customerId,
          restaurant_id: cart.restaurant_id,
          status: 'pending_payment',
          total_amount: totalAmount,
          delivery_address,
          delivery_lat: parseFloat(delivery_lat),
          delivery_lng: parseFloat(delivery_lng),
        },
      ])
      .select();

    if (orderError) {
      return res.status(400).json({ success: false, message: orderError.message });
    }

    const order = orders[0];

    // Create order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      price_snapshot: item.price_snapshot,
      item_name_snapshot: `Item ${item.menu_item_id}`, // In real app, fetch name from menu_items
    }));

    const { error: itemsInsertError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsInsertError) {
      return res.status(400).json({ success: false, message: itemsInsertError.message });
    }

    // Produce Kafka event: order.created
    await producer.send({
      topic: 'order.created',
      messages: [
        {
          key: `order-${order.id}`,
          value: JSON.stringify({
            orderId: order.id,
            customerId: order.customer_id,
            restaurantId: order.restaurant_id,
            totalAmount: order.total_amount,
            items: orderItems,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });

    // Clear cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

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
