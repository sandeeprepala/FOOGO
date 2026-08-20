import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { QuantityControl } from './QuantityControl';
import { formatCurrency } from '../utils/formatting';
import { EmptyState } from './EmptyState';

import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants';

export function CartDrawer() {
  const { isDrawerOpen, setIsDrawerOpen, items, total, removeItem, addToCart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isPartner = user?.role === ROLES.RESTAURANT || user?.role === ROLES.DELIVERY_AGENT;

  if (!isDrawerOpen || isPartner) return null;

  const handleCheckoutClick = () => {
    setIsDrawerOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-forest-green/30 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => setIsDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-surface-ivory border-l border-border-light shadow-soft-lg flex flex-col justify-between p-6 sm:p-8 transform transition-transform duration-300">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border-light">
            <div className="flex items-center gap-2 text-forest-green">
              <ShoppingBag className="w-6 h-6 text-primary-olive" />
              <h3 className="text-xl font-bold">Your Cart</h3>
              {items.length > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-card-sage font-bold text-primary-olive">
                  {items.length} items
                </span>
              )}
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 text-muted-sage hover:text-text-charcoal rounded-full hover:bg-card-sage transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content / Items List */}
          <div className="flex-1 overflow-y-auto py-6 space-y-4">
            {items.length === 0 ? (
              <EmptyState
                title="Your cart is empty"
                description="Explore local organic cafés and top restaurants nearby."
                actionText="Explore Restaurants"
                actionLink="/search"
              />
            ) : (
              <>
                <div className="flex justify-between items-center text-xs font-semibold text-muted-sage pb-2">
                  <span>Selected Items</span>
                  <button
                    onClick={clearCart}
                    className="text-muted-sage hover:text-[#D32F2F] flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear All
                  </button>
                </div>

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-card-sage border border-border-light shadow-card gap-3"
                  >
                    <div className="flex-1 space-y-1">
                      <h4 className="font-bold text-forest-green text-sm line-clamp-1">
                        {item.name || 'Menu Item'}
                      </h4>
                      <p className="text-xs font-bold text-primary-olive">
                        {formatCurrency(item.price_snapshot || item.price || 299)}
                      </p>
                    </div>

                    <QuantityControl
                      quantity={item.quantity}
                      onIncrease={() => addToCart(item.restaurant_id, item, 1)}
                      onDecrease={() => {
                        if (item.quantity === 1) {
                          removeItem(item.id, item.name);
                        } else {
                          addToCart(item.restaurant_id, item, -1);
                        }
                      }}
                      size="sm"
                    />

                    <span className="font-bold text-forest-green text-sm w-16 text-right">
                      {formatCurrency((item.price_snapshot || item.price || 299) * item.quantity)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer Summary & Checkout Button */}
          {items.length > 0 && (
            <div className="pt-6 border-t border-border-light space-y-4">
              <div className="flex justify-between items-center font-bold text-forest-green text-lg">
                <span>Subtotal</span>
                <span className="text-primary-olive text-xl">{formatCurrency(total)}</span>
              </div>

              <button
                onClick={handleCheckoutClick}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary-olive hover:bg-primary-olive-hover text-white text-base font-bold rounded-full shadow-soft hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
