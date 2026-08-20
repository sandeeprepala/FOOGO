import React from 'react';
import { Plus } from 'lucide-react';
import { QuantityControl } from './QuantityControl';
import { formatCurrency } from '../utils/formatting';
import { useCart } from '../context/CartContext';

export function MenuItemCard({ item, restaurantId }) {
  const { items, addToCart, removeItem } = useCart();

  // Find if item is in cart
  const cartItem = items.find(ci => ci.menu_item_id === item.id || ci.id === item.id);
  const currentQuantity = cartItem ? cartItem.quantity : 0;

  const handleAdd = () => {
    addToCart(restaurantId, item, 1);
  };

  const handleIncrease = () => {
    addToCart(restaurantId, item, 1);
  };

  const handleDecrease = () => {
    if (cartItem) {
      if (currentQuantity === 1) {
        removeItem(cartItem.id, item.name);
      } else {
        addToCart(restaurantId, item, -1);
      }
    }
  };

  const image = item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-3xl bg-surface-ivory border border-border-light shadow-card hover:shadow-soft transition-all duration-300 gap-4">
      {/* Details Left */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          {/* Dietary Veg / Non-Veg Indicator */}
          <span
            className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center ${
              item.is_veg !== false ? 'border-emerald-600' : 'border-rose-600'
            }`}
            title={item.is_veg !== false ? "Vegetarian" : "Non-Vegetarian"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg !== false ? 'bg-emerald-600' : 'bg-rose-600'}`} />
          </span>
          <h4 className="font-bold text-forest-green text-base sm:text-lg">{item.name}</h4>
        </div>

        <p className="text-sm font-bold text-primary-olive">{formatCurrency(item.price)}</p>

        {item.description && (
          <p className="text-xs text-muted-sage leading-relaxed line-clamp-2 pr-2">
            {item.description}
          </p>
        )}
      </div>

      {/* Image & Action Right */}
      <div className="relative self-center sm:self-auto w-full sm:w-32 h-32 sm:h-28 rounded-2xl overflow-hidden bg-card-sage shrink-0">
        <img
          src={image}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Morphing Add / Quantity Button */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 shadow-soft">
          {currentQuantity > 0 ? (
            <QuantityControl
              quantity={currentQuantity}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
              size="sm"
            />
          ) : (
            <button
              onClick={handleAdd}
              disabled={item.is_available === false}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-surface-ivory border border-primary-olive text-primary-olive hover:bg-primary-olive hover:text-white rounded-full text-xs font-bold shadow-soft transition-all duration-200 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
