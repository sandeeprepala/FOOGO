import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, ArrowRight } from 'lucide-react';

export function OrderConfirmationPage() {
  const { orderId } = useParams();

  return (
    <div className="max-w-2xl mx-auto py-12 text-center space-y-8">
      {/* On-brand Organic Confirmation Icon */}
      <div className="relative inline-flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-card-sage flex items-center justify-center text-primary-olive shadow-card border border-border-light">
          <CheckCircle2 className="w-12 h-12" />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-primary-olive uppercase tracking-wider">Order Confirmed</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-forest-green">Savoring is on the way!</h1>
        <p className="text-sm text-muted-sage font-medium">
          Order ID: <strong className="text-forest-green">{orderId}</strong>
        </p>
      </div>

      {/* Info Card recap */}
      <div className="bg-card-sage rounded-3xl p-6 border border-border-light space-y-4 text-left shadow-card">
        <div className="flex items-center justify-between pb-3 border-b border-border-light text-xs font-bold text-forest-green">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary-olive" /> Estimated Delivery
          </span>
          <span className="text-primary-olive font-extrabold">25–30 Minutes</span>
        </div>

        <div className="flex items-start gap-3 text-xs text-muted-sage">
          <MapPin className="w-4 h-4 text-primary-olive shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-forest-green">Delivery Destination</p>
            <p>Green Park, Main Market, New Delhi</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to={`/track/${orderId}`}
          className="w-full sm:w-auto px-8 py-4 bg-primary-olive hover:bg-primary-olive-hover text-white text-sm font-bold rounded-full shadow-soft hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <span>Track Order Live</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          to="/"
          className="w-full sm:w-auto px-8 py-4 bg-surface-ivory hover:bg-card-sage text-forest-green text-sm font-bold rounded-full border border-border-light transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
