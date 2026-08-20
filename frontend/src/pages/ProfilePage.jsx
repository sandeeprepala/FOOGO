import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, MapPin, ShoppingBag, Heart, LogOut, Clock, RefreshCw, ChevronRight, Edit3, Plus, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { deliveryService } from '../services/deliveryService';
import { formatCurrency, formatDate, formatStatusText } from '../utils/formatting';
import { RestaurantCard } from '../components/RestaurantCard';
import { Modal } from '../components/Modal';
import { useNearbyRestaurants } from '../hooks/useRestaurants';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import { ROLES, DEFAULT_CUSTOMER_LOCATION } from '../constants';

export function ProfilePage() {
  const { user, logout, addresses, favorites, addAddress, updateAddress, updateUserAddress, setDefaultAddress } = useAuth();
  const { addToCart } = useCart();
  const { addToast } = useNotification();
  const { data: allRestaurants = [] } = useNearbyRestaurants();

  const isAgent = user?.role === ROLES.DELIVERY_AGENT;
  const isRestaurant = user?.role === ROLES.RESTAURANT;
  const isPartner = isRestaurant || isAgent;
  const dashboardPath = isRestaurant ? '/restaurant-dashboard' : '/agent-dashboard';
  const dashboardTitle = isRestaurant ? 'Restaurant Dashboard' : 'Delivery Agent Dashboard';

  const [activeTab, setActiveTab] = useState(isPartner ? 'profile' : 'orders'); // orders | profile | addresses | favorites
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Address Modal State for Customers
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null); // null for new, ID string for edit
  const [addrTitle, setAddrTitle] = useState('Home');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrLat, setAddrLat] = useState(DEFAULT_CUSTOMER_LOCATION.lat);
  const [addrLng, setAddrLng] = useState(DEFAULT_CUSTOMER_LOCATION.lng);

  // Agent Address State
  const [agentAddress, setAgentAddress] = useState(user?.address || DEFAULT_CUSTOMER_LOCATION.address);
  const [agentLat, setAgentLat] = useState(user?.lat || DEFAULT_CUSTOMER_LOCATION.lat);
  const [agentLng, setAgentLng] = useState(user?.lng || DEFAULT_CUSTOMER_LOCATION.lng);
  const [savingAgentLoc, setSavingAgentLoc] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      if (!user?.id || isPartner) return;
      try {
        setLoadingOrders(true);
        const res = await orderService.getCustomerOrders(user.id);
        if (res?.orders) setOrders(res.orders);
      } catch (err) {
        console.warn('Orders fetch warning:', err);
      } finally {
        setLoadingOrders(false);
      }
    }
    fetchOrders();
  }, [user?.id, isPartner]);

  const favoriteRestaurants = allRestaurants.filter(r => favorites.includes(r.id));

  const handleReorder = (order) => {
    addToCart(order.restaurant_id || 'res-1', {
      id: 'item-1',
      name: 'Truffle & Wild Mushroom Pizza',
      price: 499
    }, 1);
    addToast('Items added to cart for reorder!', 'success');
  };

  const handleOpenNewAddress = () => {
    setEditingAddressId(null);
    setAddrTitle('Home');
    setAddrStreet('');
    setAddrLat(DEFAULT_CUSTOMER_LOCATION.lat);
    setAddrLng(DEFAULT_CUSTOMER_LOCATION.lng);
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddrTitle(addr.title || 'Home');
    setAddrStreet(addr.address || '');
    setAddrLat(addr.lat || DEFAULT_CUSTOMER_LOCATION.lat);
    setAddrLng(addr.lng || DEFAULT_CUSTOMER_LOCATION.lng);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddressSubmit = (e) => {
    e.preventDefault();
    if (!addrStreet.trim()) return;

    const latVal = parseFloat(addrLat) || DEFAULT_CUSTOMER_LOCATION.lat;
    const lngVal = parseFloat(addrLng) || DEFAULT_CUSTOMER_LOCATION.lng;

    if (editingAddressId) {
      updateAddress(editingAddressId, {
        title: addrTitle,
        address: addrStreet.trim(),
        lat: latVal,
        lng: lngVal
      });
      addToast('Address updated successfully', 'success');
    } else {
      addAddress({
        title: addrTitle,
        address: addrStreet.trim(),
        lat: latVal,
        lng: lngVal
      });
      addToast('New address saved to your profile', 'success');
    }
    updateUserAddress(addrStreet.trim(), latVal, lngVal);
    setIsAddressModalOpen(false);
  };

  const handleSaveAgentLocation = async (e) => {
    e.preventDefault();
    if (!agentAddress.trim()) return;
    setSavingAgentLoc(true);
    try {
      updateUserAddress(agentAddress.trim(), parseFloat(agentLat), parseFloat(agentLng));

      // Also push GPS ping to locationUpdateService if agent has ID
      if (user?.id) {
        await deliveryService.updateLocation(user.id, parseFloat(agentLat), parseFloat(agentLng));
      }
      addToast('Delivery Agent base address & GPS coordinates saved!', 'success');
    } catch (err) {
      addToast('Failed to update agent location', 'error');
    } finally {
      setSavingAgentLoc(false);
    }
  };

  return (
    <div className="space-y-8 py-4">
      <div className="flex items-center justify-between pb-6 border-b border-border-light flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-olive text-white flex items-center justify-center text-2xl font-bold shadow-soft">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-green">{user?.name || 'User Profile'}</h1>
            <p className="text-xs text-muted-sage font-medium">
              {user?.email || user?.phone_no || 'user@example.com'} • <span className="capitalize font-bold text-primary-olive">{user?.role || 'Customer'}</span>
            </p>
          </div>
        </div>

        {isPartner && (
          <Link
            to={dashboardPath}
            className="px-6 py-3 bg-primary-olive text-white font-bold text-xs rounded-full shadow-soft hover:bg-primary-olive-hover transition-colors"
          >
            Go to {dashboardTitle} →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <div className="md:col-span-4 lg:col-span-3 space-y-2">
          {!isPartner && (
            <>
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center justify-between p-4 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === 'orders'
                    ? 'bg-primary-olive text-white shadow-soft'
                    : 'bg-card-sage text-forest-green hover:bg-border-light'
                }`}
              >
                <span className="flex items-center gap-3"><ShoppingBag className="w-5 h-5" /> Order History</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveTab('favorites')}
                className={`w-full flex items-center justify-between p-4 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === 'favorites'
                    ? 'bg-primary-olive text-white shadow-soft'
                    : 'bg-card-sage text-forest-green hover:bg-border-light'
                }`}
              >
                <span className="flex items-center gap-3"><Heart className="w-5 h-5" /> Favorite Spot ({favorites.length})</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveTab('addresses')}
                className={`w-full flex items-center justify-between p-4 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === 'addresses'
                    ? 'bg-primary-olive text-white shadow-soft'
                    : 'bg-card-sage text-forest-green hover:bg-border-light'
                }`}
              >
                <span className="flex items-center gap-3"><MapPin className="w-5 h-5" /> Saved Addresses</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center justify-between p-4 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-primary-olive text-white shadow-soft'
                : 'bg-card-sage text-forest-green hover:bg-border-light'
            }`}
          >
            <span className="flex items-center gap-3"><User className="w-5 h-5" /> Account Details</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-sm font-bold text-[#D32F2F] hover:bg-[#FDF2F2] transition-colors mt-6"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>

        {/* Tab Content Panel Right */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          {/* TAB 1: ORDER HISTORY */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-forest-green">Past Orders</h3>

              {orders.length === 0 ? (
                <div className="p-8 bg-card-sage rounded-3xl text-center space-y-3 border border-border-light">
                  <p className="text-sm text-muted-sage">You haven't placed any gourmet orders yet.</p>
                  <Link to="/search" className="inline-block px-6 py-2.5 bg-primary-olive text-white text-xs font-bold rounded-full">
                    Order Food Now
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-6 rounded-3xl bg-surface-ivory border border-border-light shadow-card space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-light">
                        <div>
                          <h4 className="font-bold text-forest-green text-base">Osteria Verde</h4>
                          <p className="text-xs text-muted-sage">Order #{ord.id} • {formatDate(ord.created_at)}</p>
                        </div>
                        <span className="px-3 py-1 bg-card-sage text-primary-olive rounded-full text-xs font-bold">
                          {formatStatusText(ord.status)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-sage font-medium">Truffle Pizza x1, Rosemary Soda x2</span>
                        <span className="font-extrabold text-forest-green">{formatCurrency(ord.total_amount || 832)}</span>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          onClick={() => handleReorder(ord)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-card-sage hover:bg-border-light text-forest-green text-xs font-bold rounded-full transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Reorder
                        </button>

                        <Link
                          to={`/track/${ord.id}`}
                          className="px-5 py-2 bg-primary-olive text-white text-xs font-bold rounded-full shadow-soft hover:bg-primary-olive-hover transition-colors"
                        >
                          View Status
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FAVORITES */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-forest-green">Favorite Restaurants</h3>
              {favoriteRestaurants.length === 0 ? (
                <p className="text-sm text-muted-sage p-6 bg-card-sage rounded-2xl text-center">No favorites saved yet. Click the heart icon on any restaurant card!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {favoriteRestaurants.map(r => (
                    <RestaurantCard key={r.id} restaurant={r} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CUSTOMER SAVED ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-forest-green">Saved Delivery Addresses</h3>
                <button
                  onClick={handleOpenNewAddress}
                  className="px-4 py-2 bg-primary-olive hover:bg-primary-olive-hover text-white font-bold text-xs rounded-full shadow-soft flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add New Address
                </button>
              </div>

              <div className="space-y-3">
                {addresses.map(a => (
                  <div key={a.id} className="p-5 rounded-3xl bg-surface-ivory border border-border-light shadow-card flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                    <div className="space-y-1">
                      <h4 className="font-bold text-forest-green text-sm flex items-center gap-2">
                        {a.title}
                        {a.isDefault && <span className="text-[10px] px-2.5 py-0.5 bg-primary-olive text-white font-bold rounded-full shadow-soft">Default</span>}
                      </h4>
                      <p className="text-xs text-muted-sage font-medium">
                        {a.address} • <span className="font-mono text-[11px] text-primary-olive font-bold">GPS: ({a.lat || 28.6139}, {a.lng || 77.2090})</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!a.isDefault && (
                        <button
                          onClick={() => {
                            setDefaultAddress(a.id);
                            addToast(`"${a.title}" set as your default delivery address`, 'success');
                          }}
                          className="px-3.5 py-2 bg-card-sage hover:bg-primary-olive/10 text-primary-olive text-xs font-bold rounded-full transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Set as Default
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditAddress(a)}
                        className="px-3.5 py-2 bg-card-sage hover:bg-border-light text-forest-green text-xs font-bold rounded-full transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ACCOUNT DETAILS & AGENT LOCATION UPDATE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-card-sage p-6 sm:p-8 rounded-3xl border border-border-light space-y-4 shadow-card">
                <h3 className="text-xl font-bold text-forest-green">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                  <div>
                    <span className="text-muted-sage block mb-1">Full Name</span>
                    <span className="font-bold text-forest-green text-sm">{user?.name || 'User Name'}</span>
                  </div>
                  <div>
                    <span className="text-muted-sage block mb-1">Email Address</span>
                    <span className="font-bold text-forest-green text-sm">{user?.email || 'user@example.com'}</span>
                  </div>
                  <div>
                    <span className="text-muted-sage block mb-1">Phone Number</span>
                    <span className="font-bold text-forest-green text-sm">{user?.phone_no || '+91 9876543210'}</span>
                  </div>
                  <div>
                    <span className="text-muted-sage block mb-1">Account Role</span>
                    <span className="font-bold text-primary-olive text-sm capitalize">{user?.role || 'Customer'}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Agent Base Address & GPS Location Card */}
              {isAgent && (
                <form onSubmit={handleSaveAgentLocation} className="bg-surface-ivory p-6 sm:p-8 rounded-3xl border border-border-light space-y-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-forest-green flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary-olive" /> Delivery Agent Base Location
                    </h3>
                    <span className="px-3 py-1 bg-card-sage text-primary-olive text-[11px] font-bold rounded-full">Dispatch GPS</span>
                  </div>
                  <p className="text-xs text-muted-sage font-medium">
                    Update your primary hub address and default dispatch coordinates across New Delhi.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-forest-green mb-1">Primary Base Address</label>
                      <input
                        type="text"
                        required
                        value={agentAddress}
                        onChange={(e) => setAgentAddress(e.target.value)}
                        className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-forest-green mb-1">Latitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          required
                          value={agentLat}
                          onChange={(e) => setAgentLat(e.target.value)}
                          className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-forest-green mb-1">Longitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          required
                          value={agentLng}
                          onChange={(e) => setAgentLng(e.target.value)}
                          className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingAgentLoc}
                      className="px-6 py-3 bg-primary-olive hover:bg-primary-olive-hover text-white text-xs font-bold rounded-full shadow-soft transition-all"
                    >
                      {savingAgentLoc ? 'Saving Base Location...' : 'Save Agent Address & GPS'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Customer Address Edit / Add Modal */}
      <Modal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title={editingAddressId ? "Edit Delivery Address" : "Add New Delivery Address"}
      >
        <form onSubmit={handleSaveAddressSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-forest-green mb-1">Location Label (e.g. Home, Work, Office)</label>
            <input
              type="text"
              required
              placeholder="e.g. Home, Work Studio"
              value={addrTitle}
              onChange={(e) => setAddrTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-card-sage border border-border-light rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-forest-green mb-1">Street Address</label>
            <textarea
              required
              rows={3}
              placeholder="House/Flat No., Street, Landmark, City"
              value={addrStreet}
              onChange={(e) => setAddrStreet(e.target.value)}
              className="w-full px-4 py-2.5 bg-card-sage border border-border-light rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-forest-green mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={addrLat}
                onChange={(e) => setAddrLat(e.target.value)}
                className="w-full px-4 py-2.5 bg-card-sage border border-border-light rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-forest-green mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                required
                value={addrLng}
                onChange={(e) => setAddrLng(e.target.value)}
                className="w-full px-4 py-2.5 bg-card-sage border border-border-light rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddressModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-muted-sage hover:text-text-charcoal"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary-olive text-white font-bold text-xs rounded-full shadow-soft"
            >
              {editingAddressId ? "Update Address" : "Save New Address"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
