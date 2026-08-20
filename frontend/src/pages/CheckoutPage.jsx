import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, ShieldCheck, Plus, Check, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { PriceBreakdown } from '../components/PriceBreakdown';
import { Modal } from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { DEFAULT_CUSTOMER_LOCATION } from '../constants';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, checkout, loading } = useCart();
  const { addresses, addAddress } = useAuth();
  const { addToast } = useNotification();

  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id || 'default-addr');
  const [paymentMethod, setPaymentMethod] = useState('upi'); // upi | card | cod
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStreet, setNewStreet] = useState('');

  const activeAddr = addresses.find(a => a.id === selectedAddressId) || {
    address: DEFAULT_CUSTOMER_LOCATION.address,
    lat: DEFAULT_CUSTOMER_LOCATION.lat,
    lng: DEFAULT_CUSTOMER_LOCATION.lng
  };

  const handleCreateAddress = (e) => {
    e.preventDefault();
    if (newStreet.trim()) {
      addAddress({
        title: newTitle.trim() || 'Work',
        address: newStreet.trim(),
        lat: 28.6139,
        lng: 77.2090
      });
      setNewTitle('');
      setNewStreet('');
      setIsAddAddressOpen(false);
      addToast('New delivery address saved', 'success');
    }
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      addToast('Your cart is empty', 'warning');
      return;
    }

    try {
      const res = await checkout(
        activeAddr.address,
        activeAddr.lat || DEFAULT_CUSTOMER_LOCATION.lat,
        activeAddr.lng || DEFAULT_CUSTOMER_LOCATION.lng
      );

      if (res?.order?.id) {
        addToast('Order placed successfully! 🎉', 'success');
        navigate(`/order-confirmation/${res.order.id}`);
      }
    } catch (err) {
      // Handle authentication errors - token expired or not logged in
      if (err.status === 401 || err.status === 403 || err.message?.toLowerCase().includes('token') || err.message?.toLowerCase().includes('unauthorized')) {
        addToast('Session expired. Please log in again to place your order.', 'error', 5000);
        navigate('/login');
        return;
      }
      // Show real error message for other failures
      addToast(err.message || 'Failed to place order. Please try again.', 'error', 5000);
    }
  };

  return (
    <div className="space-y-8 py-4 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold text-forest-green">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Address + Payment Selector */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Delivery Address */}
          <div className="bg-surface-ivory rounded-3xl p-6 border border-border-light shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-forest-green text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-olive" /> Delivery Location
              </h3>
              <button
                onClick={() => setIsAddAddressOpen(true)}
                className="text-xs font-bold text-primary-olive hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Address
              </button>
            </div>

            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                    selectedAddressId === addr.id
                      ? 'bg-card-sage border-primary-olive ring-1 ring-primary-olive'
                      : 'bg-surface-ivory border-border-light hover:bg-card-sage'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-forest-green text-sm flex items-center gap-2">
                      {addr.title || 'Address'}
                      {addr.isDefault && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-olive/10 text-primary-olive font-bold">Default</span>}
                    </h4>
                    <p className="text-xs text-muted-sage">{addr.address}</p>
                  </div>
                  {selectedAddressId === addr.id && (
                    <div className="w-5 h-5 rounded-full bg-primary-olive text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Payment Method */}
          <div className="bg-surface-ivory rounded-3xl p-6 border border-border-light shadow-card space-y-4">
            <h3 className="font-bold text-forest-green text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-olive" /> Payment Method
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                  paymentMethod === 'upi'
                    ? 'bg-card-sage border-primary-olive text-forest-green ring-1 ring-primary-olive'
                    : 'bg-surface-ivory border-border-light text-muted-sage hover:bg-card-sage'
                }`}
              >
                Instant UPI (GPay/PhonePe)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-card-sage border-primary-olive text-forest-green ring-1 ring-primary-olive'
                    : 'bg-surface-ivory border-border-light text-muted-sage hover:bg-card-sage'
                }`}
              >
                Credit / Debit Card
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                  paymentMethod === 'cod'
                    ? 'bg-card-sage border-primary-olive text-forest-green ring-1 ring-primary-olive'
                    : 'bg-surface-ivory border-border-light text-muted-sage hover:bg-card-sage'
                }`}
              >
                Cash on Delivery
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Bill Breakdown & Place Order */}
        <div className="lg:col-span-5 space-y-6">
          <PriceBreakdown subtotal={total} deliveryFee={35} tax={25} />

          <button
            onClick={handlePlaceOrder}
            disabled={loading || items.length === 0}
            className="w-full flex items-center justify-center gap-2 py-4 bg-primary-olive hover:bg-primary-olive-hover text-white font-bold text-base rounded-full shadow-soft hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <span>{loading ? 'Processing Order...' : 'Place Order Now'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Add Address Modal */}
      <Modal
        isOpen={isAddAddressOpen}
        onClose={() => setIsAddAddressOpen(false)}
        title="Add New Address"
      >
        <form onSubmit={handleCreateAddress} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-forest-green mb-1">Label (e.g. Home, Work, Office)</label>
            <input
              type="text"
              required
              placeholder="e.g. Work Studio"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-card-sage border border-border-light rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-forest-green mb-1">Complete Street Address</label>
            <textarea
              required
              rows={3}
              placeholder="House/Flat No., Building Name, Street, Landmark"
              value={newStreet}
              onChange={(e) => setNewStreet(e.target.value)}
              className="w-full px-4 py-2.5 bg-card-sage border border-border-light rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddAddressOpen(false)}
              className="px-4 py-2 text-xs font-bold text-muted-sage hover:text-text-charcoal"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary-olive text-white font-bold text-xs rounded-full shadow-soft"
            >
              Save Address
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
