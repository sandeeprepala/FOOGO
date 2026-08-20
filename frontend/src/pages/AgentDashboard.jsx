import React, { useState, useEffect, useCallback } from 'react';
import { Bike, Navigation, MapPin, CheckCircle2, Send, Clock, Check } from 'lucide-react';
import { deliveryService } from '../services/deliveryService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ManagedWebSocket } from '../api/websocket';
import { SOCKET_URLS } from '../constants';
import { formatCurrency, formatDate } from '../utils/formatting';

export function AgentDashboard() {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const agentId = user?.id || 'agent-1';

  const [activeOrder, setActiveOrder] = useState(null);
  const [nearbyOffers, setNearbyOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState(null);

  const [currentLat, setCurrentLat] = useState(user?.lat || 28.6150);
  const [currentLng, setCurrentLng] = useState(user?.lng || 77.2150);

  // Load active assignment and nearby available orders
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch active delivery for this agent
      try {
        const activeRes = await deliveryService.getActiveDeliveries(agentId);
        if (activeRes?.orders && activeRes.orders.length > 0) {
          setActiveOrder(activeRes.orders[0]);
        } else {
          setActiveOrder(null);
        }
      } catch (e) {
        console.warn('Active delivery fetch notice:', e.message);
      }

      // Fetch nearby available orders (status = accepted_by_restaurant) within 5km
      try {
        const availRes = await deliveryService.getAvailableOrders(currentLat, currentLng, 5);
        setNearbyOffers(availRes?.orders || []);
      } catch (e) {
        console.warn('Available orders fetch notice:', e.message);
      }
    } catch (err) {
      console.warn('Agent dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId, currentLat, currentLng]);

  useEffect(() => {
    loadDashboardData();

    // Auto-poll available orders every 6 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 6000);

    // Subscribe to Delivery Agent WebSocket broadcasts
    const wsUrl = SOCKET_URLS.AGENT_NOTIF(agentId);
    const socket = new ManagedWebSocket(
      wsUrl,
      (data) => {
        if (data.event === 'nearby_order') {
          addToast('🛵 New Order Delivery Offer nearby!', 'info');
          loadDashboardData();
        }
      },
      () => {}
    );
    socket.isClosedManually = false;
    socket.connect();

    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, [agentId, loadDashboardData]);

  const handleAcceptOffer = async (orderId) => {
    setClaimingId(orderId);
    try {
      const res = await deliveryService.acceptOrder(orderId, agentId);
      if (res?.success && res?.order) {
        addToast(`🎉 Order #${orderId} Accepted! Drive safely.`, 'success');
        setActiveOrder(res.order);
        setNearbyOffers(prev => prev.filter(o => o.id !== orderId));
      } else {
        addToast(res?.message || 'Failed to claim order', 'error');
      }
    } catch (err) {
      if (err.status === 409) {
        addToast('⚠️ Another agent already claimed this order', 'warning');
      } else {
        addToast(`Claim failed: ${err.message}`, 'error');
      }
    } finally {
      setClaimingId(null);
      loadDashboardData();
    }
  };

  const handleUpdateLocation = async (newLat, newLng) => {
    setCurrentLat(newLat);
    setCurrentLng(newLng);
    try {
      const orderIdToBroadcast = activeOrder?.id || 8;
      await deliveryService.updateLocation(agentId, newLat, newLng, orderIdToBroadcast);
      addToast(`📡 GPS Broadcast Sent to Order #${orderIdToBroadcast}: (${newLat.toFixed(4)}, ${newLng.toFixed(4)})`, 'success', 2500);
    } catch (err) {
      console.warn('Location update notice:', err);
    }
  };

  const handleStatusChange = async (statusKey) => {
    if (!activeOrder) return;
    try {
      if (statusKey === 'picked_up') {
        await deliveryService.markPickedUp(activeOrder.id, agentId);
      } else if (statusKey === 'on_the_way') {
        await deliveryService.markOnTheWay(activeOrder.id, agentId);
      } else if (statusKey === 'delivered') {
        await deliveryService.markDelivered(activeOrder.id, agentId);
      }
      setActiveOrder(prev => ({ ...prev, status: statusKey }));
      addToast(`Delivery status updated to: ${statusKey.replace(/_/g, ' ')}`, 'success');

      if (statusKey === 'delivered') {
        setActiveOrder(null);
        loadDashboardData();
      }
    } catch (err) {
      addToast(err.message || 'Status update failed', 'error');
    }
  };

  return (
    <div className="space-y-8 py-4">
      {/* Agent Header */}
      <div className="bg-surface-ivory p-6 sm:p-8 rounded-3xl border border-border-light shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-olive text-white flex items-center justify-center font-bold text-xl shadow-soft">
            <Bike className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-green">{user?.name || 'Delivery Agent Portal'}</h1>
            <p className="text-xs text-muted-sage font-medium">Agent ID: #{agentId} • Active Dispatch Center</p>
          </div>
        </div>

        <div className="px-4 py-2 bg-card-sage border border-border-light rounded-full text-xs font-bold text-primary-olive flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          ONLINE FOR DISPATCH
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Left Content: Nearby Offers + Active Assignment */}
        <div className="lg:col-span-7 space-y-6">

          {/* Section 1: Nearby Offers (5km radius) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-forest-green flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-olive" />
                Available Deliveries (5km Radius)
                {nearbyOffers.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-primary-olive text-white text-[11px] font-bold rounded-full">{nearbyOffers.length}</span>
                )}
              </h3>
              <span className="text-xs text-muted-sage font-medium animate-pulse">Live Broadcast Active</span>
            </div>

            {nearbyOffers.length === 0 ? (
              <div className="p-6 bg-card-sage rounded-3xl text-center border border-border-light">
                <p className="text-sm text-muted-sage font-medium">No nearby delivery offers right now.</p>
                <p className="text-xs text-muted-sage mt-1">Orders accepted by nearby restaurants will appear here automatically.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {nearbyOffers.map((ord) => (
                  <div key={ord.id} className="p-6 rounded-3xl bg-surface-ivory border-2 border-primary-olive/30 shadow-card space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border-light">
                      <div>
                        <h4 className="font-bold text-forest-green text-base">Order #{ord.id}</h4>
                        <p className="text-xs text-muted-sage">{ord.created_at ? formatDate(ord.created_at) : 'Just now'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-primary-olive font-extrabold text-base block">{formatCurrency(ord.total_amount || ord.totalAmount || 0)}</span>
                        {ord.distance_km !== undefined && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-card-sage font-bold text-forest-green">
                            📍 {ord.distance_km} km away
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-text-charcoal font-medium flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-primary-olive shrink-0" />
                      Delivery to: <strong>{ord.delivery_address || ord.deliveryAddress || 'Green Park, New Delhi'}</strong>
                    </p>

                    <div className="pt-2">
                      <button
                        onClick={() => handleAcceptOffer(ord.id)}
                        disabled={claimingId === ord.id}
                        className="w-full py-3 bg-primary-olive hover:bg-primary-olive-hover text-white text-xs font-bold rounded-full shadow-soft transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Bike className="w-4 h-4" />
                        {claimingId === ord.id ? 'Claiming Order...' : 'Accept Delivery Offer'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Active Assignment Control */}
          <div className="bg-surface-ivory p-6 rounded-3xl border border-border-light shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h3 className="font-bold text-forest-green text-lg flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary-olive" /> Active Assignment
              </h3>
              {activeOrder && (
                <span className="px-3 py-1 bg-card-sage text-primary-olive rounded-full text-xs font-extrabold uppercase">
                  {activeOrder.status}
                </span>
              )}
            </div>

            {activeOrder ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-forest-green text-base">Order #{activeOrder.id}</h4>
                  <p className="text-xs text-muted-sage flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary-olive shrink-0" /> {activeOrder.delivery_address || activeOrder.deliveryAddress}
                  </p>
                </div>

                <div className="p-4 bg-card-sage rounded-2xl border border-border-light flex justify-between items-center text-xs font-bold text-forest-green">
                  <span>Order Value</span>
                  <span className="text-primary-olive text-sm">{formatCurrency(activeOrder.total_amount || activeOrder.totalAmount || 0)}</span>
                </div>

                {/* Status Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => handleStatusChange('picked_up')}
                    className={`py-3 rounded-2xl text-xs font-bold transition-all border ${
                      activeOrder.status === 'picked_up' ? 'bg-primary-olive text-white border-primary-olive' : 'bg-surface-ivory border-border-light hover:bg-card-sage'
                    }`}
                  >
                    1. Picked Up
                  </button>
                  <button
                    onClick={() => handleStatusChange('on_the_way')}
                    className={`py-3 rounded-2xl text-xs font-bold transition-all border ${
                      activeOrder.status === 'on_the_way' ? 'bg-primary-olive text-white border-primary-olive' : 'bg-surface-ivory border-border-light hover:bg-card-sage'
                    }`}
                  >
                    2. On The Way
                  </button>
                  <button
                    onClick={() => handleStatusChange('delivered')}
                    className={`py-3 rounded-2xl text-xs font-bold transition-all border ${
                      activeOrder.status === 'delivered' ? 'bg-primary-olive text-white border-primary-olive' : 'bg-surface-ivory border-border-light hover:bg-card-sage'
                    }`}
                  >
                    3. Delivered
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-sage text-center py-6">No active delivery assignment. Accept an offer above to get started!</p>
            )}
          </div>

        </div>

        {/* GPS Live Movement Simulator Right */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card-sage p-6 rounded-3xl border border-border-light space-y-4 shadow-card">
            <h3 className="font-bold text-forest-green text-lg flex items-center gap-2">
              <Send className="w-5 h-5 text-primary-olive" /> Live GPS Simulator
            </h3>
            <p className="text-xs text-muted-sage font-medium">
              Simulate moving coordinates across New Delhi to test live customer tracking map interpolation.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleUpdateLocation(currentLat + 0.002, currentLng + 0.002)}
                className="py-3 px-2 bg-surface-ivory hover:bg-border-light text-forest-green font-bold text-xs rounded-2xl border border-border-light transition-colors text-center"
              >
                ↗️ Move North-East (+0.002)
              </button>

              <button
                onClick={() => handleUpdateLocation(currentLat + 0.002, currentLng - 0.002)}
                className="py-3 px-2 bg-surface-ivory hover:bg-border-light text-forest-green font-bold text-xs rounded-2xl border border-border-light transition-colors text-center"
              >
                ↖️ Move North-West (+0.002)
              </button>

              <button
                onClick={() => handleUpdateLocation(currentLat - 0.002, currentLng + 0.002)}
                className="py-3 px-2 bg-surface-ivory hover:bg-border-light text-forest-green font-bold text-xs rounded-2xl border border-border-light transition-colors text-center"
              >
                ↘️ Move South-East (-0.002)
              </button>

              <button
                onClick={() => handleUpdateLocation(currentLat - 0.002, currentLng - 0.002)}
                className="py-3 px-2 bg-surface-ivory hover:bg-border-light text-forest-green font-bold text-xs rounded-2xl border border-border-light transition-colors text-center"
              >
                ↙️ Move South-West (-0.002)
              </button>
            </div>

            <div className="p-3 bg-surface-ivory rounded-xl text-center text-xs font-mono font-bold text-forest-green border border-border-light">
              Current GPS: {currentLat.toFixed(4)}, {currentLng.toFixed(4)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
