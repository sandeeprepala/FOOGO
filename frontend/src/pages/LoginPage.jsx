import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ROLES } from '../constants';
import { UtensilsCrossed, ArrowRight } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useNotification();

  const [role, setRole] = useState(ROLES.CUSTOMER);
  const [email, setEmail] = useState('john@example.com');
  const [phoneNo, setPhoneNo] = useState('+9999999999');
  const [password, setPassword] = useState('secret123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const credentials = role === ROLES.DELIVERY_AGENT
        ? { phone_no: phoneNo, password }
        : { email, password };

      await login(role, credentials);
      addToast('Welcome back!', 'success');
      if (role === ROLES.RESTAURANT) navigate('/restaurant-dashboard');
      else if (role === ROLES.DELIVERY_AGENT) navigate('/agent-dashboard');
      else navigate('/');
    } catch (err) {
      addToast(err.message || 'Login failed. Please check credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-primary-olive text-white flex items-center justify-center mx-auto shadow-soft">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-forest-green">Welcome to FOO GO</h1>
        <p className="text-xs text-muted-sage font-medium">Sign in to manage orders, menus, and track live deliveries.</p>
      </div>

      {/* Role Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-card-sage p-1.5 rounded-full border border-border-light text-xs font-bold">
        <button
          type="button"
          onClick={() => setRole(ROLES.CUSTOMER)}
          className={`py-2 rounded-full transition-all ${role === ROLES.CUSTOMER ? 'bg-primary-olive text-white shadow-soft' : 'text-forest-green hover:bg-surface-ivory'}`}
        >
          Customer
        </button>
        <button
          type="button"
          onClick={() => setRole(ROLES.RESTAURANT)}
          className={`py-2 rounded-full transition-all ${role === ROLES.RESTAURANT ? 'bg-primary-olive text-white shadow-soft' : 'text-forest-green hover:bg-surface-ivory'}`}
        >
          Restaurant
        </button>
        <button
          type="button"
          onClick={() => setRole(ROLES.DELIVERY_AGENT)}
          className={`py-2 rounded-full transition-all ${role === ROLES.DELIVERY_AGENT ? 'bg-primary-olive text-white shadow-soft' : 'text-forest-green hover:bg-surface-ivory'}`}
        >
          Delivery Agent
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-ivory p-8 rounded-3xl border border-border-light shadow-card space-y-4">
        {role === ROLES.DELIVERY_AGENT ? (
          <div>
            <label className="block text-xs font-bold text-forest-green mb-1">Phone Number</label>
            <input
              type="text"
              required
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-forest-green mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-forest-green mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-primary-olive hover:bg-primary-olive-hover text-white font-bold text-sm rounded-full shadow-soft transition-all flex items-center justify-center gap-2"
        >
          <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="text-center text-xs text-muted-sage">
        Don't have an account?{' '}
        <Link to={`/register?role=${role}`} className="text-primary-olive font-bold hover:underline">
          Create Account
        </Link>
      </p>
    </div>
  );
}
