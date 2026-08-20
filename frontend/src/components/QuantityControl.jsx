import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

export function QuantityControl({ quantity, onIncrease, onDecrease, min = 0, disabled = false, size = 'md' }) {
  const isSmall = size === 'sm';

  return (
    <div className={`inline-flex items-center bg-card-sage border border-border-light rounded-full p-1 shadow-inner ${isSmall ? 'h-8' : 'h-10'}`}>
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled || quantity <= min}
        className={`flex items-center justify-center rounded-full bg-surface-ivory text-forest-green hover:bg-primary-olive hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-surface-ivory disabled:hover:text-forest-green ${
          isSmall ? 'w-6 h-6' : 'w-8 h-8'
        }`}
        aria-label="Decrease quantity"
      >
        {quantity === 1 && min === 0 ? <Trash2 className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} /> : <Minus className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />}
      </button>

      <span className={`font-bold text-forest-green text-center ${isSmall ? 'px-2 text-xs min-w-[20px]' : 'px-3 text-sm min-w-[28px]'}`}>
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        className={`flex items-center justify-center rounded-full bg-surface-ivory text-forest-green hover:bg-primary-olive hover:text-white transition-colors disabled:opacity-40 ${
          isSmall ? 'w-6 h-6' : 'w-8 h-8'
        }`}
        aria-label="Increase quantity"
      >
        <Plus className={isSmall ? 'w-3 h-3' : 'w-4 h-4'} />
      </button>
    </div>
  );
}
