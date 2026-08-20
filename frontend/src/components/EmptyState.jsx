import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EmptyState({
  icon: Icon = UtensilsCrossed,
  title = "Nothing here yet",
  description = "Your cart is hungry for something delicious.",
  actionText = "Browse Restaurants",
  actionLink = "/search"
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-surface-ivory rounded-3xl border border-border-light shadow-card my-6">
      <div className="w-20 h-20 bg-card-sage rounded-full flex items-center justify-center text-primary-olive mb-4 shadow-inner">
        <Icon className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-bold text-forest-green mb-2">{title}</h3>
      <p className="text-muted-sage max-w-sm mb-6 text-sm leading-relaxed">{description}</p>
      {actionLink && (
        <Link
          to={actionLink}
          className="px-6 py-3 bg-primary-olive hover:bg-primary-olive-hover text-white text-sm font-medium rounded-full shadow-soft hover:shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          {actionText}
        </Link>
      )}
    </div>
  );
}
