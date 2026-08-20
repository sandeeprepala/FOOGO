import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-surface-ivory border-t border-border-light mt-16 py-12">
      <div className="w-full px-4 sm:px-8 lg:px-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-border-light">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-olive flex items-center justify-center text-white">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-forest-green">
                FOO <span className="text-primary-olive">GO</span>
              </span>
            </Link>
            <p className="text-xs text-muted-sage leading-relaxed">
              Crafted organic dining delivered fresh to your doorstep. Experience restaurant quality cuisine with real-time tracking.
            </p>
          </div>

          {/* Nav Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-forest-green text-sm">Discover</h4>
            <ul className="space-y-2 text-xs text-muted-sage font-medium">
              <li><Link to="/search" className="hover:text-primary-olive transition-colors">Popular Restaurants</Link></li>
              <li><Link to="/search?cuisine=Italian" className="hover:text-primary-olive transition-colors">Italian & Pizza</Link></li>
              <li><Link to="/search?cuisine=Healthy" className="hover:text-primary-olive transition-colors">Healthy Bowls</Link></li>
              <li><Link to="/search?cuisine=Indian" className="hover:text-primary-olive transition-colors">Authentic Indian</Link></li>
            </ul>
          </div>

          {/* Partners */}
          <div className="space-y-3">
            <h4 className="font-bold text-forest-green text-sm">Partners</h4>
            <ul className="space-y-2 text-xs text-muted-sage font-medium">
              <li><Link to="/register?role=restaurant" className="hover:text-primary-olive transition-colors">Add your restaurant</Link></li>
              <li><Link to="/register?role=delivery_agent" className="hover:text-primary-olive transition-colors">Become a delivery partner</Link></li>
              <li><Link to="/restaurant-dashboard" className="hover:text-primary-olive transition-colors">Merchant Portal</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-bold text-forest-green text-sm">Legal & Support</h4>
            <ul className="space-y-2 text-xs text-muted-sage font-medium">
              <li><span className="hover:text-primary-olive cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-primary-olive cursor-pointer">Terms of Service</span></li>
              <li><span className="hover:text-primary-olive cursor-pointer">Help & Customer Care</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-sage">
          <p>© {new Date().getFullYear()} FOO GO Technologies. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 fill-primary-olive text-primary-olive" /> for great food lovers.
          </p>
        </div>
      </div>
    </footer>
  );
}
