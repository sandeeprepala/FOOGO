import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Clock, MapPin, Tag, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNearbyRestaurants, useRestaurantMenu } from '../hooks/useRestaurants';
import { MenuItemCard } from '../components/MenuItemCard';
import { MenuItemSkeleton } from '../components/Skeleton';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/formatting';

export function RestaurantDetailPage() {
  const { id } = useParams();
  const { data: restaurants = [] } = useNearbyRestaurants();
  const { data: menuItems = [], isLoading: isMenuLoading } = useRestaurantMenu(id);
  const { itemCount, total, setIsDrawerOpen } = useCart();
  const [activeCategory, setActiveCategory] = useState('all');

  // URL param id is always a string; DB restaurant ids may be numbers — use loose equality
  const numericId = parseInt(id, 10);
  const restaurant = restaurants.find(r => r.id === numericId || r.id === id || String(r.id) === id) || {
    id: numericId || id || 'res-1',
    name: 'Restaurant',
    cuisine_type: 'Various',
    address: 'Loading...',
    rating: 4.5,
    deliveryTime: '25–35 min',
    priceRange: '₹₹',
    is_open: true,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    offer: null
  };

  // Group menu items by category
  const categories = Array.from(new Set(menuItems.map(item => item.category || 'General')));

  const filteredMenuItems = activeCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  return (
    <div className="space-y-8 py-4 pb-24">
      {/* Restaurant Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-card-sage border border-border-light shadow-card">
        <div className="h-64 sm:h-80 w-full relative">
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-green/90 via-forest-green/40 to-transparent" />
        </div>

        {/* Floating Details Overlay */}
        <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 text-white space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${restaurant.is_open ? 'bg-primary-olive text-white' : 'bg-muted-sage text-white'}`}>
              {restaurant.is_open ? 'OPEN NOW' : 'CLOSED'}
            </span>
            <span className="flex items-center gap-1 bg-surface-ivory/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/20">
              <Star className="w-3.5 h-3.5 fill-primary-olive text-primary-olive" />
              {restaurant.rating} Rating
            </span>
            {restaurant.offer && (
              <span className="flex items-center gap-1 bg-primary-olive px-3 py-1 rounded-full text-xs font-bold">
                <Tag className="w-3.5 h-3.5" /> {restaurant.offer}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{restaurant.name}</h1>
          <p className="text-sm opacity-90 font-medium flex flex-wrap items-center gap-4">
            <span>{restaurant.cuisine_type}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-primary-olive" /> {restaurant.deliveryTime}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-primary-olive" /> {restaurant.address}</span>
          </p>
        </div>
      </div>

      {/* Sticky Menu Category Bar */}
      <div className="sticky top-20 z-30 bg-surface-ivory/95 backdrop-blur-md py-3 border-b border-border-light">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              activeCategory === 'all'
                ? 'bg-primary-olive text-white border-primary-olive shadow-soft'
                : 'bg-card-sage text-forest-green border-border-light hover:bg-border-light'
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all capitalize border ${
                activeCategory === cat
                  ? 'bg-primary-olive text-white border-primary-olive shadow-soft'
                  : 'bg-card-sage text-forest-green border-border-light hover:bg-border-light'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items List */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-forest-green capitalize">{activeCategory} Menu</h3>

        {isMenuLoading ? (
          <div className="space-y-4">
            <MenuItemSkeleton />
            <MenuItemSkeleton />
            <MenuItemSkeleton />
          </div>
        ) : filteredMenuItems.length === 0 ? (
          <p className="text-sm text-muted-sage p-6 text-center">No menu items available under this category.</p>
        ) : (
          <div className="space-y-4">
            {filteredMenuItems.map((item) => (
              <MenuItemCard key={item.id} item={item} restaurantId={restaurant.id} />
            ))}
          </div>
        )}
      </div>

      {/* Sticky Mini Cart Bar at Bottom (when items > 0) */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-md w-full px-4">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-full flex items-center justify-between p-4 bg-primary-olive hover:bg-primary-olive-hover text-white rounded-full shadow-soft-lg transition-all transform hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-extrabold text-sm">
                {itemCount}
              </div>
              <div className="text-left">
                <p className="text-xs opacity-90">View Cart</p>
                <p className="text-base font-extrabold">{formatCurrency(total)}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 font-bold text-sm">
              <span>Checkout</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
