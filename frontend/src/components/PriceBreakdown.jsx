import React from 'react';
import { formatCurrency } from '../utils/formatting';
import { ShieldCheck, Tag } from 'lucide-react';

export function PriceBreakdown({ subtotal = 0, deliveryFee = 35, tax = 25, discount = 0 }) {
  const total = Math.max(0, subtotal + deliveryFee + tax - discount);

  return (
    <div className="bg-card-sage border border-border-light rounded-2xl p-5 space-y-3">
      <h4 className="font-bold text-forest-green text-base flex items-center gap-2 pb-2 border-b border-border-light">
        <ShieldCheck className="w-5 h-5 text-primary-olive" />
        Bill Summary
      </h4>

      <div className="flex justify-between text-sm text-text-charcoal">
        <span className="text-muted-sage">Item Subtotal</span>
        <span className="font-medium">{formatCurrency(subtotal)}</span>
      </div>

      <div className="flex justify-between text-sm text-text-charcoal">
        <span className="text-muted-sage">Delivery Fee</span>
        <span className="font-medium">{deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}</span>
      </div>

      <div className="flex justify-between text-sm text-text-charcoal">
        <span className="text-muted-sage">Taxes & Packaging Charges</span>
        <span className="font-medium">{formatCurrency(tax)}</span>
      </div>

      {discount > 0 && (
        <div className="flex justify-between text-sm text-primary-olive font-medium">
          <span className="flex items-center gap-1">
            <Tag className="w-4 h-4" /> Promo Discount
          </span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      )}

      <div className="pt-3 border-t border-border-light flex justify-between items-center font-bold text-forest-green text-lg">
        <span>To Pay</span>
        <span className="text-primary-olive text-xl">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
