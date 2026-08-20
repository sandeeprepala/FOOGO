import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, User, Menu, X, LogOut, UtensilsCrossed, Bike, ShieldAlert } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount, setIsDrawerOpen } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isRestaurant = user?.role === ROLES.RESTAURANT;
  const isAgent = user?.role === ROLES.DELIVERY_AGENT;
  const isPartner = isRestaurant || isAgent;

  const brandHomePath = isRestaurant
    ? '/restaurant-dashboard'
    : isAgent
    ? '/agent-dashboard'
    : '/';

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-surface-ivory/95 backdrop-blur-md border-b border-border-light transition-all duration-300">
      <div className="w-full px-4 sm:px-8 lg:px-16 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to={brandHomePath} className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-full bg-primary-olive flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-forest-green">
            FOO <span className="text-primary-olive">GO</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-text-charcoal">
          {isRestaurant ? (
            <Link
              to="/restaurant-dashboard"
              className={`transition-colors hover:text-primary-olive flex items-center gap-1.5 ${isActive('/restaurant-dashboard') ? 'text-primary-olive font-bold' : ''}`}
            >
              <UtensilsCrossed className="w-4 h-4 text-primary-olive" /> Restaurant Dashboard
            </Link>
          ) : isAgent ? (
            <Link
              to="/agent-dashboard"
              className={`transition-colors hover:text-primary-olive flex items-center gap-1.5 ${isActive('/agent-dashboard') ? 'text-primary-olive font-bold' : ''}`}
            >
              <Bike className="w-4 h-4 text-primary-olive" /> Agent Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/"
                className={`transition-colors hover:text-primary-olive ${isActive('/') ? 'text-primary-olive font-bold' : ''}`}
              >
                Home
              </Link>
              <Link
                to="/search"
                className={`transition-colors hover:text-primary-olive ${isActive('/search') ? 'text-primary-olive font-bold' : ''}`}
              >
                Explore
              </Link>
              <Link
                to="/search?cuisine=all"
                className={`transition-colors hover:text-primary-olive ${location.search.includes('cuisine') ? 'text-primary-olive font-bold' : ''}`}
              >
                Restaurants
              </Link>
            </>
          )}
        </nav>

        {/* Actions Right */}
        <div className="flex items-center gap-3 sm:gap-4">
          {!isPartner && (
            <>
              {/* Search Trigger */}
              <button
                onClick={() => navigate('/search')}
                className="p-2.5 rounded-full text-forest-green hover:bg-card-sage transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Cart Icon with Live Badge */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="relative p-2.5 rounded-full text-forest-green hover:bg-card-sage transition-colors"
                aria-label="Open cart"
              >
                <ShoppingBag className="w-5 h-5 text-forest-green" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-olive text-white text-xs font-bold flex items-center justify-center shadow-soft animate-scalePulse">
                    {itemCount}
                  </span>
                )}
              </button>
            </>
          )}

          {/* Profile / Auth Menu */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-card-sage border border-border-light hover:border-primary-olive transition-all text-forest-green font-bold text-xs"
              >
                <div className="w-7 h-7 rounded-full bg-primary-olive text-white flex items-center justify-center font-bold">
                  {user?.name ? user.name[0].toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <span className="hidden sm:inline line-clamp-1">{user?.name || 'Account'}</span>
              </Link>

              <button
                onClick={logout}
                className="p-2 text-muted-sage hover:text-[#D32F2F] rounded-full hover:bg-card-sage transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden sm:inline-flex px-5 py-2.5 bg-card-sage hover:bg-border-light text-forest-green text-xs font-bold rounded-full transition-colors"
            >
              Sign In
            </Link>
          )}

          {!isPartner && (
            <Link
              to="/search"
              className="hidden sm:inline-flex px-6 py-2.5 bg-primary-olive hover:bg-primary-olive-hover text-white text-sm font-bold rounded-full shadow-soft hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              Order Now →
            </Link>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-forest-green hover:bg-card-sage rounded-full"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-ivory border-b border-border-light px-6 py-6 space-y-4">
          {isRestaurant ? (
            <Link
              to="/restaurant-dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-bold text-forest-green"
            >
              Restaurant Dashboard
            </Link>
          ) : isAgent ? (
            <Link
              to="/agent-dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-bold text-forest-green"
            >
              Agent Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-bold text-forest-green"
              >
                Home
              </Link>
              <Link
                to="/search"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-bold text-forest-green"
              >
                Explore Restaurants
              </Link>
            </>
          )}

          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-base font-bold text-forest-green"
              >
                My Account Profile
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left text-base font-bold text-[#D32F2F]"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center py-3 bg-primary-olive text-white font-bold rounded-full"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
