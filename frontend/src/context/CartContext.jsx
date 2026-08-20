import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartService } from '../services/cartService';
import { restaurantService } from '../services/restaurantService';
import { useAuth } from './AuthContext';
import { useNotification } from '../context/NotificationContext';
import { toNumericId } from '../utils/formatting';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [cart, setCart] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Dynamic customer ID (prioritizes logged-in user ID, falls back to 1 for unauthenticated testing)
  const activeCustomerId = user?.id ? toNumericId(user.id, 1) : 1;

  // Fetch Cart from Backend (only for customers)
  const fetchCart = useCallback(async () => {
    // Cart endpoints are customer-only — skip for restaurant/delivery_agent roles
    if (user && user.role && user.role !== 'customer') return;
    try {
      setLoading(true);
      const res = await cartService.getCart(activeCustomerId);
      if (res?.success) {
        setCart(res.cart || null);
        if (res.items && res.items.length > 0) {
          setItems(res.items);
          setTotal(res.total || 0);
        }
      }
    } catch (err) {
      console.warn('Fetch cart notice:', err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCustomerId, user?.role]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Helper to sync single item to backend DB
  const syncItemToBackend = async (restaurantId, menuItem, quantity = 1) => {
    const validRestId = toNumericId(restaurantId, 1);
    let validMenuId = toNumericId(menuItem.menu_item_id || menuItem.id, 1);

    try {
      const res = await cartService.addToCart(validRestId, validMenuId, quantity, activeCustomerId);
      if (res?.success) return res;
    } catch (err) {
      // Auto-create menu item in DB if missing (404)
      try {
        const created = await restaurantService.addMenuItem(validRestId, {
          name: menuItem.name || 'Gourmet Dish',
          description: menuItem.description || 'Fresh organic meal',
          price: menuItem.price || menuItem.price_snapshot || 299,
          category: menuItem.category || 'main'
        });

        if (created?.menu_item?.id) {
          validMenuId = toNumericId(created.menu_item.id, 1);
          return await cartService.addToCart(validRestId, validMenuId, quantity, activeCustomerId);
        }
      } catch (createErr) {
        console.warn('Auto-create menu item warning:', createErr.message);
      }
    }
  };

  // Add Item to Cart (Optimistic + Backend sync)
  const addToCart = async (restaurantId, menuItem, quantity = 1) => {
    const validRestId = toNumericId(restaurantId, 1);
    const validMenuId = toNumericId(menuItem.id, 1);

    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(ci => 
        toNumericId(ci.menu_item_id || ci.id, 1) === validMenuId
      );
      let updated = [...prevItems];

      if (existingIndex > -1) {
        const newQty = updated[existingIndex].quantity + quantity;
        if (newQty <= 0) {
          updated.splice(existingIndex, 1);
        } else {
          updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        }
      } else if (quantity > 0) {
        updated.push({
          id: validMenuId,
          menu_item_id: validMenuId,
          restaurant_id: validRestId,
          name: menuItem.name,
          price_snapshot: menuItem.price || 299,
          quantity: quantity
        });
      }

      const newTotal = updated.reduce((sum, item) => sum + (item.price_snapshot || item.price || 299) * item.quantity, 0);
      setTotal(newTotal);
      return updated;
    });

    addToast(`Added ${menuItem.name} to cart`, 'success');
    await syncItemToBackend(validRestId, menuItem, quantity);
    return true;
  };

  // Remove Item from Cart
  const removeItem = async (cartItemId, itemName = 'Item') => {
    const validItemId = toNumericId(cartItemId, 1);
    setItems(prev => {
      const updated = prev.filter(ci => toNumericId(ci.id || ci.menu_item_id, 1) !== validItemId);
      const newTotal = updated.reduce((sum, item) => sum + (item.price_snapshot || item.price || 299) * item.quantity, 0);
      setTotal(newTotal);
      return updated;
    });

    addToast(`Removed ${itemName} from cart`, 'info');

    try {
      await cartService.removeItem(validItemId, activeCustomerId);
    } catch (err) {
      console.warn('[Backend remove sync note]:', err.message);
    }
  };

  // Clear Cart
  const clearCart = async () => {
    setCart(null);
    setItems([]);
    setTotal(0);
    addToast('Cart cleared', 'info');

    try {
      await cartService.clearCart(activeCustomerId);
    } catch (err) {
      console.warn('[Backend clear sync note]:', err.message);
    }
  };

  // Checkout
  const checkout = async (deliveryAddress, deliveryLat, deliveryLng) => {
    try {
      setLoading(true);

      for (const item of items) {
        await syncItemToBackend(
          item.restaurant_id || 1,
          item,
          item.quantity || 1
        );
      }

      const res = await cartService.checkout(deliveryAddress, deliveryLat, deliveryLng, activeCustomerId, items);
      if (res?.success && res?.order) {
        setCart(null);
        setItems([]);
        setTotal(0);
        return res;
      }
      // If response was not successful but no error thrown
      throw new Error(res?.message || 'Checkout failed');
    } catch (err) {
      // Rethrow auth errors (401/403) so the UI can redirect to login
      if (err.status === 401 || err.status === 403) {
        throw err;
      }
      console.warn('Checkout error:', err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const itemCount = items.reduce((acc, item) => acc + (item.quantity || 1), 0);

  return (
    <CartContext.Provider value={{
      cart,
      items,
      total,
      itemCount,
      loading,
      isDrawerOpen,
      setIsDrawerOpen,
      addToCart,
      removeItem,
      clearCart,
      checkout,
      refreshCart: fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
