import React from 'react';
import { ORDER_TIMELINE_STEPS } from '../constants';
import { Check, Clock } from 'lucide-react';

export function OrderStatusTimeline({ currentStatus = 'placed' }) {
  const getStepIndex = (status) => {
    switch (status) {
      case 'pending_payment':
      case 'placed': return 0;
      case 'accepted_by_restaurant':
      case 'agent_assigned': return 1;
      case 'preparing': return 2;
      case 'picked_up': return 3;
      case 'on_the_way': return 4;
      case 'delivered': return 5;
      case 'rejected_by_restaurant': return -1;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);
  const isRejected = currentStatus === 'rejected_by_restaurant';

  if (isRejected) {
    return (
      <div className="p-6 bg-[#FDF2F2] border border-[#E57373] rounded-3xl text-center">
        <h4 className="text-lg font-bold text-[#7A1C1C]">Order Cancelled</h4>
        <p className="text-sm text-[#992D2D] mt-1">The restaurant was unable to accept your order.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-ivory rounded-3xl p-6 border border-border-light shadow-card space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-forest-green text-lg">Order Status</h3>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-card-sage text-primary-olive rounded-full text-xs font-semibold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" /> Live Updates
        </span>
      </div>

      <div className="relative pl-6 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-light">
        {ORDER_TIMELINE_STEPS.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.key} className="relative flex items-start group">
              {/* Timeline Marker Node */}
              <div
                className={`absolute -left-6 top-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isDone
                    ? 'bg-primary-olive text-white shadow-soft ring-4 ring-pale-sage'
                    : 'bg-card-sage text-muted-sage border border-border-light'
                } ${isCurrent ? 'scale-110 animate-pulse-subtle ring-primary-olive/30' : ''}`}
              >
                {isDone ? <Check className="w-4 h-4" /> : idx + 1}
              </div>

              {/* Step Label */}
              <div className="ml-4">
                <h4 className={`text-base font-bold leading-tight ${isCurrent ? 'text-forest-green text-lg' : isDone ? 'text-text-charcoal' : 'text-muted-sage'}`}>
                  {step.label}
                </h4>
                <p className={`text-xs mt-0.5 ${isCurrent ? 'text-primary-olive font-medium' : 'text-muted-sage'}`}>
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
