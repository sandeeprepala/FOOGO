import React from 'react';

export function RestaurantCardSkeleton() {
  return (
    <div className="bg-surface-ivory rounded-3xl p-4 border border-border-light shadow-card space-y-4">
      <div className="w-full h-48 rounded-2xl skeleton-shimmer" />
      <div className="space-y-2">
        <div className="w-3/4 h-5 rounded-lg skeleton-shimmer" />
        <div className="w-1/2 h-4 rounded-lg skeleton-shimmer" />
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-border-light">
        <div className="w-20 h-4 rounded-lg skeleton-shimmer" />
        <div className="w-16 h-4 rounded-lg skeleton-shimmer" />
      </div>
    </div>
  );
}

export function MenuItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-card-sage border border-border-light space-x-4">
      <div className="space-y-2 flex-1">
        <div className="w-1/3 h-5 rounded-lg skeleton-shimmer" />
        <div className="w-2/3 h-4 rounded-lg skeleton-shimmer" />
        <div className="w-16 h-4 rounded-lg skeleton-shimmer" />
      </div>
      <div className="w-24 h-24 rounded-2xl skeleton-shimmer shrink-0" />
    </div>
  );
}
