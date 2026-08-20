import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Clock, ShieldCheck, MapPin, ArrowRight, Star, Heart, Quote, CheckCircle2 } from 'lucide-react';
import { CUISINES } from '../constants';
import { useNearbyRestaurants } from '../hooks/useRestaurants';
import { RestaurantCard } from '../components/RestaurantCard';
import { RestaurantCardSkeleton } from '../components/Skeleton';
import { generateFoodPhoto } from '../utils/mockImages';

import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants';

export function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const { data: restaurants = [], isLoading } = useNearbyRestaurants();

  // Redirect restaurant & delivery agent partners to their dedicated dashboards
  React.useEffect(() => {
    if (user?.role === ROLES.RESTAURANT) {
      navigate('/restaurant-dashboard', { replace: true });
    } else if (user?.role === ROLES.DELIVERY_AGENT) {
      navigate('/agent-dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const filteredRestaurants = selectedCuisine === 'all'
    ? restaurants
    : restaurants.filter(r => r.cuisine_type?.toLowerCase().includes(selectedCuisine.toLowerCase()));

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (emailInput) {
      setSubscribed(true);
      setEmailInput('');
    }
  };

  return (
    <div className="space-y-16 py-4">
      {/* SECTION 1: HERO (Asymmetric composition: bold editorial copy left, organic circular plate right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-card-sage/60 rounded-3xl p-6 sm:p-10 lg:p-12 border border-border-light shadow-card">
        {/* Left Column: Text & Search Input */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface-ivory rounded-full border border-border-light text-xs font-bold text-primary-olive shadow-card">
            <span className="w-2 h-2 rounded-full bg-primary-olive animate-pulse" />
            <span>Organic Café & Gourmet Delivery</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-forest-green tracking-tight leading-[1.08]">
            SAVOR THE FLAVOR OF <span className="text-primary-olive">GREAT FOOD</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-sage leading-relaxed max-w-xl font-medium">
            Handcrafted meals from local artisan kitchens, prepared with fresh organic ingredients and delivered straight to your table in 30 minutes.
          </p>

          {/* Large Tactile Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-lg">
            <div className="flex items-center bg-surface-ivory rounded-full p-2 border border-border-light shadow-soft focus-within:ring-2 focus-within:ring-primary-olive transition-all">
              <Search className="w-6 h-6 text-muted-sage ml-3 shrink-0" />
              <input
                type="text"
                placeholder="What are you craving?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-transparent text-forest-green placeholder-muted-sage focus:outline-none text-base font-medium"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-primary-olive hover:bg-primary-olive-hover text-white font-bold text-sm rounded-full shadow-soft hover:shadow-lg transition-all shrink-0"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Organic Plate Hero Photo */}
        <div className="lg:col-span-5 relative flex justify-center items-center">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-full overflow-hidden border-8 border-surface-ivory shadow-soft-lg group">
            <img
              src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1000&q=80"
              alt="Artisan Organic Salad & Fresh Ingredients"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          </div>

          {/* Soft Pill Info Card Accent Overlay */}
          <div className="absolute -bottom-4 -left-2 sm:bottom-4 sm:left-2 bg-surface-ivory/95 backdrop-blur-md p-3.5 rounded-2xl border border-border-light shadow-soft flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-olive/10 flex items-center justify-center text-primary-olive">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-forest-green">30 Min Avg</p>
              <p className="text-[10px] text-muted-sage font-medium">Lightning Fast Delivery</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: INFO STRIP (3 Trio Pill Cards) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-card-sage border border-border-light shadow-card">
          <div className="w-12 h-12 rounded-full bg-primary-olive/15 flex items-center justify-center text-primary-olive shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-forest-green text-sm">30 Min Express</h4>
            <p className="text-xs text-muted-sage font-medium">Hot & fresh food delivered quickly</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 rounded-2xl bg-card-sage border border-border-light shadow-card">
          <div className="w-12 h-12 rounded-full bg-primary-olive/15 flex items-center justify-center text-primary-olive shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-forest-green text-sm">500+ Verified Kitchens</h4>
            <p className="text-xs text-muted-sage font-medium">Top hygeine & organic standards</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-5 rounded-2xl bg-card-sage border border-border-light shadow-card">
          <div className="w-12 h-12 rounded-full bg-primary-olive/15 flex items-center justify-center text-primary-olive shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-forest-green text-sm">Live GPS Tracking</h4>
            <p className="text-xs text-muted-sage font-medium">Watch your rider on the map</p>
          </div>
        </div>
      </section>

      {/* SECTION 3: CUISINE CATEGORIES (Horizontal Chip Scroll) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-green">Explore Cuisines</h2>
          <Link to="/search" className="text-xs sm:text-sm font-bold text-primary-olive hover:underline flex items-center gap-1">
            See all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-none">
          {CUISINES.map((cuisine) => {
            const isSelected = selectedCuisine === cuisine.id;
            return (
              <button
                key={cuisine.id}
                onClick={() => setSelectedCuisine(cuisine.id)}
                className={`px-5 py-3 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 shadow-card border ${
                  isSelected
                    ? 'bg-primary-olive text-white border-primary-olive scale-105 shadow-soft'
                    : 'bg-surface-ivory text-forest-green border-border-light hover:bg-card-sage'
                }`}
              >
                {cuisine.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: POPULAR RESTAURANTS GRID */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-forest-green">Popular Restaurants</h2>
            <p className="text-xs sm:text-sm text-muted-sage font-medium">Handpicked organic spots around you</p>
          </div>
          <Link to="/search" className="text-xs sm:text-sm font-bold text-primary-olive hover:underline flex items-center gap-1">
            View Map & Filters <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <RestaurantCardSkeleton />
            <RestaurantCardSkeleton />
            <RestaurantCardSkeleton />
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="p-8 bg-card-sage rounded-3xl text-center space-y-2 border border-border-light">
            <p className="text-forest-green font-bold text-base">No restaurants available</p>
            <p className="text-xs text-muted-sage font-medium">There are currently no active restaurants in the database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((res) => (
              <RestaurantCard key={res.id} restaurant={res} />
            ))}
          </div>
        )}
      </section>

      {/* SECTION 5: PROMO / OFFER BAND */}
      <section className="bg-card-sage rounded-3xl p-8 sm:p-10 border border-border-light flex flex-col md:flex-row items-center justify-between gap-6 shadow-card">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-bold text-primary-olive uppercase tracking-wider">Exclusive Offer</span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-forest-green">
            Get 20% OFF Your First Gourmet Order
          </h3>
          <p className="text-sm text-muted-sage">Use coupon code <strong className="text-forest-green bg-surface-ivory px-2 py-0.5 rounded border border-border-light">FOOGO20</strong> at checkout.</p>
        </div>
        <Link
          to="/search"
          className="px-8 py-4 bg-primary-olive hover:bg-primary-olive-hover text-white text-sm font-bold rounded-full shadow-soft hover:shadow-lg transition-all shrink-0"
        >
          Claim Offer Now
        </Link>
      </section>

      {/* SECTION 6: TRUST & TESTIMONIAL BLOCK (Reference aesthetic) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-surface-ivory rounded-3xl p-8 border border-border-light shadow-card">
        <div className="lg:col-span-4 relative flex justify-center">
          <div className="w-56 h-56 rounded-full overflow-hidden border-4 border-card-sage shadow-soft">
            <img
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"
              alt="Artisan Dining"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <Quote className="w-10 h-10 text-primary-olive/30" />
          <p className="text-base sm:text-lg text-forest-green italic font-medium leading-relaxed">
            "FOO GO completely transformed our weekend dinners. The food arrives fresh, piping hot, and the tracking accuracy is remarkable."
          </p>
          <div>
            <h5 className="font-bold text-forest-green text-sm">Elena Vance</h5>
            <p className="text-xs text-muted-sage">Food & Travel Journalist</p>
          </div>
        </div>
      </section>

      {/* SECTION 7: NEWSLETTER SUBSCRIBE BAR */}
      <section className="bg-card-sage rounded-3xl p-8 sm:p-12 text-center space-y-6 border border-border-light">
        <div className="max-w-xl mx-auto space-y-2">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-forest-green">Join the FOO GO Foodie Club</h3>
          <p className="text-xs sm:text-sm text-muted-sage font-medium">
            Receive curated chef recommendations, secret promo codes, and seasonal menu drops directly in your inbox.
          </p>
        </div>

        {subscribed ? (
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-surface-ivory text-primary-olive rounded-full font-bold text-sm border border-primary-olive">
            <CheckCircle2 className="w-5 h-5" /> You're on the list! Welcome aboard.
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex items-center bg-surface-ivory rounded-full p-2 border border-border-light shadow-card">
            <input
              type="email"
              required
              placeholder="Enter your email address"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full px-4 text-xs sm:text-sm bg-transparent text-forest-green focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-primary-olive hover:bg-primary-olive-hover text-white text-xs font-bold rounded-full shadow-soft transition-all shrink-0"
            >
              Subscribe
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
