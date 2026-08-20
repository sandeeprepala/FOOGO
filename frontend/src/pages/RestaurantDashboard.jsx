import React, { useState, useEffect, useCallback } from 'react';
import { Utensils, Clock, Check, X, Plus, ToggleLeft, ToggleRight, Trash2, RefreshCw } from 'lucide-react';
import { orderService } from '../services/orderService';
import { restaurantService } from '../services/restaurantService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { formatCurrency, formatDate } from '../utils/formatting';
import { Modal } from '../components/Modal';
import { ManagedWebSocket } from '../api/websocket';
import { SOCKET_URLS } from '../constants';

export function RestaurantDashboard() {
  const { user } = useAuth();
  const { addToast } = useNotification();

  const restaurantId = user?.id || '5';
  const [isOpen, setIsOpen] = useState(true);
  const [orders, setOrders] = useState([]);          // status=placed (needs action)
  const [activeOrders, setActiveOrders] = useState([]); // status=accepted_by_restaurant
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Add Item Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemCategory, setItemCategory] = useState('pizza');

  // Load incoming orders and menu items
  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return; // Only fetch if logged in as restaurant
    try {
      setLoading(true);

      // Fetch real orders for this restaurant from the DB
      try {
        const res = await orderService.getRestaurantIncomingOrders(restaurantId);
        setOrders(res?.orders || []);              // needs accept/reject
        setActiveOrders(res?.active_orders || []); // already accepted
      } catch (e) {
        // Only clear orders on non-auth errors (auth errors handled globally)
        if (e.status !== 401 && e.status !== 403) {
          console.warn('Orders fetch error:', e.message);
          setOrders([]);
          setActiveOrders([]);
        }
      }

      // Fetch Menu Items
      try {
        const menuRes = await restaurantService.getMenu(restaurantId);
        if (menuRes?.menu_items) setMenuItems(menuRes.menu_items);
      } catch (e) { }
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, user?.id]);

  useEffect(() => {
    // Only start polling and WebSocket if logged in as restaurant
    if (!user?.id || user?.role !== 'restaurant') return;

    loadDashboardData();

    // Auto-poll incoming orders every 8 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 8000);

    // Listen to real-time incoming orders via WebSocket
    const wsUrl = SOCKET_URLS.RESTAURANT_NOTIF(restaurantId);
    const socket = new ManagedWebSocket(
      wsUrl,
      (data) => {
        if (data.event === 'new_order' || data.orderId) {
          addToast(`🔔 New Order Received: #${data.orderId || 'Live'}!`, 'info', 6000);
          loadDashboardData();
        }
      },
      () => { }
    );
    // Reset closed flag before connecting (StrictMode-safe)
    socket.isClosedManually = false;
    socket.connect();

    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, [restaurantId, loadDashboardData, user?.id, user?.role]);

  const handleToggleOpen = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    try {
      await restaurantService.toggleOpenStatus(restaurantId, nextState);
      addToast(`Restaurant is now ${nextState ? 'OPEN' : 'CLOSED'}`, 'info');
    } catch (e) {
      console.warn(e);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    // Optimistically mark as processing in UI
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, _processing: true } : o));
    try {
      await orderService.restaurantAccept(orderId);
      addToast(`✅ Order #${orderId} ACCEPTED!`, 'success');
      // Remove from incoming orders list (accepted orders leave this view)
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      // Undo the processing flag and show real error
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, _processing: false } : o));
      if (err.status === 401 || err.status === 403) {
        addToast('Session expired — please log in again', 'error');
      } else {
        addToast(`Failed to accept order: ${err.message}`, 'error');
      }
    }
  };

  const handleRejectOrder = async (orderId) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, _processing: true } : o));
    try {
      await orderService.restaurantReject(orderId, 'Kitchen busy');
      addToast(`Order #${orderId} rejected`, 'info');
      // Remove from incoming orders list
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, _processing: false } : o));
      if (err.status === 401 || err.status === 403) {
        addToast('Session expired — please log in again', 'error');
      } else {
        addToast(`Failed to reject order: ${err.message}`, 'error');
      }
    }
  };

  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    try {
      await restaurantService.addMenuItem(restaurantId, {
        name: itemName,
        price: Number(itemPrice),
        description: itemDesc,
        category: itemCategory
      });
      addToast('Menu item added successfully', 'success');
      setIsModalOpen(false);
      setItemName('');
      setItemPrice('');
      setItemDesc('');
      loadDashboardData();
    } catch (err) {
      addToast(err.message || 'Failed to add item', 'error');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await restaurantService.deleteMenuItem(restaurantId, itemId);
      addToast('Item removed', 'info');
      loadDashboardData();
    } catch (err) {
      addToast(err.message || 'Failed to delete item', 'error');
    }
  };

  // Show login prompt if not authenticated as a restaurant
  if (!user || user.role !== 'restaurant') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-card-sage flex items-center justify-center">
          <Utensils className="w-8 h-8 text-primary-olive" />
        </div>
        <h2 className="text-2xl font-extrabold text-forest-green">Restaurant Portal</h2>
        <p className="text-sm text-muted-sage max-w-sm">
          You need to be logged in as a <strong>Restaurant</strong> to access this dashboard.
        </p>
        <a
          href="/login"
          className="mt-2 px-6 py-3 bg-primary-olive text-white font-bold rounded-full shadow-soft hover:bg-primary-olive-hover transition-all"
        >
          Log in as Restaurant
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      {/* Merchant Header */}
      <div className="bg-surface-ivory p-6 sm:p-8 rounded-3xl border border-border-light shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-olive text-white flex items-center justify-center font-bold text-xl shadow-soft">
            <Utensils className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-green">{user?.name || 'Restaurant Dashboard'}</h1>
            <p className="text-xs text-muted-sage font-medium">Merchant Control Center • Manage incoming orders and menu items</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="p-2.5 rounded-full bg-card-sage text-forest-green hover:bg-border-light transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Toggle Store Status */}
          <button
            onClick={handleToggleOpen}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-card border ${isOpen ? 'bg-primary-olive text-white border-primary-olive' : 'bg-card-sage text-muted-sage border-border-light'
              }`}
          >
            {isOpen ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            <span>{isOpen ? 'STORE OPEN' : 'STORE CLOSED'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Incoming + Active Orders Left */}
        <div className="lg:col-span-7 space-y-6">

          {/* Section 1: New Orders needing action */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-forest-green flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-olive" />
                New Orders
                {orders.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-primary-olive text-white text-[11px] font-bold rounded-full">{orders.length}</span>
                )}
              </h3>
              <span className="text-xs text-muted-sage font-medium animate-pulse">Live Polling Active</span>
            </div>

            {orders.length === 0 ? (
              <div className="p-6 bg-card-sage rounded-3xl text-center border border-border-light">
                <p className="text-sm text-muted-sage font-medium">No new orders waiting.</p>
                <p className="text-xs text-muted-sage mt-1">Paid orders placed by customers will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => (
                  <div key={ord.id} className={`p-6 rounded-3xl bg-surface-ivory border-2 border-primary-olive/30 shadow-card space-y-4 transition-opacity ${ord._processing ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between pb-3 border-b border-border-light">
                      <div>
                        <h4 className="font-bold text-forest-green text-base">Order #{ord.id}</h4>
                        <p className="text-xs text-muted-sage">{formatDate(ord.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-primary-olive font-extrabold text-base block">{formatCurrency(ord.total_amount)}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold uppercase">
                          Awaiting Response
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-text-charcoal font-medium">
                      📍 <strong>{ord.delivery_address}</strong>
                    </p>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => handleRejectOrder(ord.id)}
                        disabled={!!ord._processing}
                        className="px-4 py-2 bg-[#FDF2F2] hover:bg-[#F8D7D7] text-[#D32F2F] text-xs font-bold rounded-full transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <X className="w-4 h-4" /> {ord._processing ? 'Processing...' : 'Reject'}
                      </button>
                      <button
                        onClick={() => handleAcceptOrder(ord.id)}
                        disabled={!!ord._processing}
                        className="px-6 py-2 bg-primary-olive hover:bg-primary-olive-hover text-white text-xs font-bold rounded-full shadow-soft transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="w-4 h-4" /> {ord._processing ? 'Processing...' : 'Accept Order'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Active orders being prepared */}
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-forest-green flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                In Preparation
                <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 text-[11px] font-bold rounded-full">{activeOrders.length}</span>
              </h3>
              <div className="space-y-3">
                {activeOrders.map((ord) => (
                  <div key={ord.id} className="p-5 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-forest-green text-sm">Order #{ord.id}</p>
                      <p className="text-xs text-muted-sage">{formatDate(ord.created_at)}</p>
                      <p className="text-xs text-text-charcoal mt-1">📍 {ord.delivery_address}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-primary-olive font-extrabold text-base block">{formatCurrency(ord.total_amount)}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-200 text-green-800 font-bold uppercase">
                        Preparing
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Menu Items Right */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-forest-green">Menu Management</h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-primary-olive text-white rounded-full text-xs font-bold shadow-soft flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {menuItems.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl bg-card-sage border border-border-light flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-forest-green text-sm">{item.name}</h4>
                  <p className="text-xs text-primary-olive font-bold">{formatCurrency(item.price)}</p>
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 text-muted-sage hover:text-[#D32F2F] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Menu Item Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Menu Item">
        <form onSubmit={handleAddMenuItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-forest-green mb-1">Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Garlic Herb Pizza"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-4 py-2.5 bg-card-sage border border-border-light rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-forest-green mb-1">Price (₹)</label>
              <input
                type="number"
                required
                placeholder="299"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                className="w-full px-4 py-2.5 bg-card-sage border border-border-light rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-forest-green mb-1">Category</label>
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-card-sage border border-border-light rounded-xl text-sm font-bold text-forest-green"
              >
                <option value="pizza">Pizza</option>
                <option value="main">Main Course</option>
                <option value="Healthy">Healthy</option>
                <option value="Desserts">Desserts</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-forest-green mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Short description of ingredients"
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              className="w-full px-4 py-2.5 bg-card-sage border border-border-light rounded-xl text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-muted-sage">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 bg-primary-olive text-white font-bold text-xs rounded-full">
              Save Item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
