import React from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, Utensils, Bike } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { CartDrawer } from '../components/CartDrawer';
import { ChatbotWidget } from '../components/ChatbotWidget';
import { ToastContainer } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

export function AppLayout({ children }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-surface-ivory text-text-charcoal font-sans selection:bg-primary-olive selection:text-white">
      {/* Role Dev Switcher Banner */}
      <div className="w-full hidden sm:flex items-center justify-between text-xs text-muted-sage bg-card-sage/80 backdrop-blur-sm px-8 py-2 border-b border-border-light">
        <div className="flex items-center gap-2 font-medium">
          <UserCheck className="w-4 h-4 text-primary-olive" />
          <span>Active Role: <strong className="text-forest-green capitalize">{user?.role || 'Guest Customer'}</strong></span>
        </div>
        <div className="flex items-center gap-3 font-semibold">
          <Link to="/" className="hover:text-primary-olive transition-colors flex items-center gap-1">
            Customer View
          </Link>
          <span>•</span>
          <Link to="/restaurant-dashboard" className="hover:text-primary-olive transition-colors flex items-center gap-1">
            <Utensils className="w-3.5 h-3.5" /> Restaurant Portal
          </Link>
          <span>•</span>
          <Link to="/agent-dashboard" className="hover:text-primary-olive transition-colors flex items-center gap-1">
            <Bike className="w-3.5 h-3.5" /> Agent Dashboard
          </Link>
        </div>
      </div>

      {/* Full-width app shell */}
      <div className="w-full min-h-screen flex flex-col bg-surface-ivory">
        <Navbar />

        <main className="flex-1 px-4 sm:px-8 lg:px-16 py-6 sm:py-8">
          {children}
        </main>

        <Footer />
      </div>

      <CartDrawer />
      <ChatbotWidget />
      <ToastContainer />
    </div>
  );
}
