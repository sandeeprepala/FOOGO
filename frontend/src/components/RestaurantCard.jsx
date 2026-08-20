import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Heart, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDistance } from '../utils/formatting';

export function RestaurantCard({ restaurant }) {
  const { favorites, toggleFavorite } = useAuth();
  const isFav = favorites.includes(restaurant.id);

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(restaurant.id);
  };

  const image = restaurant.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';

  return (
    <Link
      to={`/restaurant/${restaurant.id}`}
      className="group block bg-surface-ivory rounded-3xl p-4 border border-border-light shadow-card hover:shadow-soft-lg transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Image Container */}
      <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden mb-4 bg-card-sage">
        <img
          src={image}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Favorite Heart Button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 p-2.5 rounded-full bg-surface-ivory/90 backdrop-blur-md text-forest-green hover:text-primary-olive shadow-soft transition-all duration-200"
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={`w-5 h-5 transition-colors ${isFav ? 'fill-primary-olive text-primary-olive scale-110' : ''}`} />
        </button>

        {/* Offer Badge Overlay */}
        {restaurant.offer && (
          <div className="absolute bottom-3 left-3 bg-primary-olive text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-card flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            <span>{restaurant.offer}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-forest-green text-lg group-hover:text-primary-olive transition-colors line-clamp-1">
            {restaurant.name}
          </h3>
          <span className="shrink-0 flex items-center gap-1 bg-card-sage px-2.5 py-1 rounded-full text-xs font-bold text-forest-green border border-border-light">
            <Star className="w-3.5 h-3.5 fill-primary-olive text-primary-olive" />
            {restaurant.rating || '4.8'}
          </span>
        </div>

        <p className="text-xs text-muted-sage font-medium line-clamp-1">
          {restaurant.cuisine_type || 'Italian'} • {restaurant.address || 'Green Park'}
        </p>

        <div className="pt-2 border-t border-border-light flex items-center justify-between text-xs font-medium text-text-charcoal">
          <span className="flex items-center gap-1 text-muted-sage">
            <Clock className="w-3.5 h-3.5 text-primary-olive" />
            {restaurant.deliveryTime || '25–30 min'}
          </span>

          <span className="text-muted-sage">
            {formatDistance(restaurant.distance_km)}
          </span>

          <span className="font-bold text-forest-green">
            {restaurant.priceRange || '₹₹'}
          </span>
        </div>
      </div>
    </Link>
  );
}
