import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Star, SlidersHorizontal, Utensils } from 'lucide-react';
import { useNearbyRestaurants } from '../hooks/useRestaurants';
import { RestaurantCard } from '../components/RestaurantCard';
import { RestaurantCardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { CUISINES } from '../constants';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCuisine = searchParams.get('cuisine') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [selectedCuisine, setSelectedCuisine] = useState(initialCuisine);
  const [vegOnly, setVegOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('rating'); // rating | distance | speed

  const { data: restaurants = [], isLoading } = useNearbyRestaurants();

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      // Query filter
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchName = r.name?.toLowerCase().includes(q);
        const matchCuisine = r.cuisine_type?.toLowerCase().includes(q);
        if (!matchName && !matchCuisine) return false;
      }

      // Cuisine filter
      if (selectedCuisine !== 'all') {
        if (!r.cuisine_type?.toLowerCase().includes(selectedCuisine.toLowerCase())) {
          return false;
        }
      }

      // Rating filter
      if (minRating > 0 && (r.rating || 4.5) < minRating) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 4.5) - (a.rating || 4.5);
      if (sortBy === 'distance') return (a.distance_km || 0) - (b.distance_km || 0);
      return 0;
    });
  }, [restaurants, query, selectedCuisine, minRating, sortBy]);

  const handleCuisineSelect = (id) => {
    setSelectedCuisine(id);
    setSearchParams(prev => {
      if (id === 'all') prev.delete('cuisine');
      else prev.set('cuisine', id);
      return prev;
    });
  };

  return (
    <div className="space-y-8 py-4">
      {/* Header & Search Bar */}
      <div className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-forest-green">Explore Restaurants</h1>
        <p className="text-sm text-muted-sage font-medium">Discover local kitchens, gourmet dining, and fresh daily menus.</p>

        <div className="relative max-w-2xl">
          <div className="flex items-center bg-surface-ivory rounded-full p-2 border border-border-light shadow-soft focus-within:ring-2 focus-within:ring-primary-olive transition-all">
            <Search className="w-5 h-5 text-muted-sage ml-3 shrink-0" />
            <input
              type="text"
              placeholder="Search by restaurant name or dish..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 bg-transparent text-forest-green placeholder-muted-sage focus:outline-none text-sm sm:text-base font-medium"
            />
          </div>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="bg-card-sage p-4 sm:p-6 rounded-3xl border border-border-light space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border-light">
          <div className="flex items-center gap-2 font-bold text-forest-green text-sm">
            <SlidersHorizontal className="w-4 h-4 text-primary-olive" />
            <span>Refine Search</span>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs font-semibold text-text-charcoal">
            <span className="text-muted-sage">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface-ivory border border-border-light rounded-full px-3 py-1.5 focus:outline-none font-bold text-forest-green cursor-pointer"
            >
              <option value="rating">Top Rated ⭐</option>
              <option value="distance">Nearest Distance</option>
            </select>
          </div>
        </div>

        {/* Cuisine Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CUISINES.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCuisineSelect(c.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCuisine === c.id
                  ? 'bg-primary-olive text-white border-primary-olive'
                  : 'bg-surface-ivory text-forest-green border-border-light hover:bg-card-sage'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Extra Quick Toggles (Rating / Veg) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold">
          <button
            onClick={() => setMinRating(minRating === 4.5 ? 0 : 4.5)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
              minRating === 4.5 ? 'bg-primary-olive text-white border-primary-olive' : 'bg-surface-ivory text-forest-green border-border-light'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" /> 4.5+ Rated
          </button>
        </div>
      </div>

      {/* Results Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-muted-sage">
          <span>Showing {filteredRestaurants.length} Restaurants</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <RestaurantCardSkeleton />
            <RestaurantCardSkeleton />
            <RestaurantCardSkeleton />
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="No matching restaurants found"
            description="Try clearing filters or searching for another dish or cuisine."
            actionText="Reset Search"
            actionLink="/search"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((res) => (
              <RestaurantCard key={res.id} restaurant={res} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
