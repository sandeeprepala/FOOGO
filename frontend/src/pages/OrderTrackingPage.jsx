import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, ArrowLeft, Bike, ShieldCheck, Loader2 } from 'lucide-react';
import { OrderStatusTimeline } from '../components/OrderStatusTimeline';
import { LiveTrackingMap } from '../components/LiveTrackingMap';
import { useWebSocketTracking } from '../hooks/useWebSocketTracking';
import { orderService } from '../services/orderService';
import { formatStatusText, formatCurrency } from '../utils/formatting';

export function OrderTrackingPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [agent, setAgent] = useState(null);
  const [currentStatus, setCurrentStatus] = useState('placed');
  const [loading, setLoading] = useState(true);

  const assignedAgentId = order?.delivery_agent_id || agent?.id;
  const initialAgentPos = agent?.lat && agent?.lng ? { lat: Number(agent.lat), lng: Number(agent.lng) } : null;
  const { agentLocation, connectionStatus, isStale, secondsAgo } = useWebSocketTracking(orderId, assignedAgentId, initialAgentPos);

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      try {
        const data = await orderService.getOrderById(orderId);
        if (data?.order) {
          setOrder(data.order);
          setCurrentStatus(data.order.status || 'placed');
        }
        if (data?.items) {
          setItems(data.items);
        }
        // Agent info is bundled in the order response
        if (data?.agent) {
          setAgent(data.agent);
        }
      } catch (err) {
        console.warn('Order tracking fetch warning:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();

    // Poll status every 8 seconds for live updates
    const interval = setInterval(async () => {
      try {
        const data = await orderService.getOrderById(orderId);
        if (data?.order?.status) {
          setCurrentStatus(data.order.status);
          setOrder(data.order);
        }
        if (data?.items) setItems(data.items);
        if (data?.agent) setAgent(data.agent);
      } catch (e) {}
    }, 8000);

    return () => clearInterval(interval);
  }, [orderId]);

  const customerPos = [order?.delivery_lat || 28.6139, order?.delivery_lng || 77.2090];
  const restaurantPos = [28.6120, 77.2100];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-muted-sage">
          <Loader2 className="w-10 h-10 animate-spin text-primary-olive" />
          <p className="text-sm font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="p-2 rounded-full bg-card-sage text-forest-green hover:bg-border-light transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-green">Tracking Order</h1>
            <p className="text-xs text-muted-sage font-medium">Order ID: #{orderId}</p>
          </div>
        </div>

        <div className="px-4 py-1.5 bg-card-sage text-primary-olive rounded-full text-xs font-bold border border-border-light">
          {formatStatusText(currentStatus)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Live Map & Agent Info */}
        <div className="lg:col-span-7 space-y-6">
          <LiveTrackingMap
            customerPos={customerPos}
            restaurantPos={restaurantPos}
            agentPos={agentLocation || initialAgentPos}
            connectionStatus={connectionStatus}
            isStale={isStale}
            secondsAgo={secondsAgo}
          />

          {/* Delivery Agent Card */}
          <div className="bg-surface-ivory rounded-3xl p-6 border border-border-light shadow-card flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary-olive/15 flex items-center justify-center text-primary-olive font-bold text-xl border border-primary-olive/30">
                <Bike className="w-7 h-7 text-primary-olive" />
              </div>
              <div>
                {agent ? (
                  <>
                    <h4 className="font-bold text-forest-green text-base">{agent.name}</h4>
                    <p className="text-xs text-muted-sage font-medium">Delivery Partner • {agent.vehicle_number || 'Assigned'}</p>
                  </>
                ) : order?.delivery_agent_id ? (
                  <>
                    <h4 className="font-bold text-forest-green text-base">Assigned Delivery Partner</h4>
                    <p className="text-xs text-muted-sage font-medium">Delivery Partner • Assigned</p>
                  </>
                ) : (
                  <>
                    <h4 className="font-bold text-forest-green text-base">Awaiting Assignment</h4>
                    <p className="text-xs text-muted-sage font-medium">Delivery agent will be assigned shortly</p>
                  </>
                )}
                <div className="flex items-center gap-1 text-[11px] text-primary-olive font-bold mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Vaccinated &amp; Health Checked
                </div>
              </div>
            </div>

            {(agent?.phone || order?.delivery_agent_id) && (
              <a
                href={`tel:${agent?.phone || '+919876543210'}`}
                className="p-3.5 rounded-full bg-primary-olive text-white shadow-soft hover:bg-primary-olive-hover transition-colors shrink-0"
                aria-label="Call delivery agent"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>

        {/* Right Column: Status Timeline & Order Summary */}
        <div className="lg:col-span-5 space-y-6">
          <OrderStatusTimeline currentStatus={currentStatus} />

          {/* Order Summary Box */}
          <div className="bg-card-sage rounded-3xl p-6 border border-border-light space-y-3">
            <h4 className="font-bold text-forest-green text-sm pb-2 border-b border-border-light">
              Order Details
            </h4>
            <div className="space-y-2 text-xs text-text-charcoal font-medium">
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-0.5">
                    <span>{item.name || `Gourmet Dish #${idx + 1}`} x{item.quantity}</span>
                    <span className="font-bold">{formatCurrency((item.price || 299) * item.quantity)}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-sage text-xs italic">No order items recorded.</p>
              )}

              {order?.delivery_address && (
                <div className="pt-2 border-t border-border-light text-muted-sage">
                  📍 {order.delivery_address}
                </div>
              )}

              <div className="pt-2 border-t border-border-light flex justify-between font-bold text-forest-green text-sm">
                <span>Total Paid</span>
                <span className="text-primary-olive">
                  {order?.total_amount ? formatCurrency(order.total_amount) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
