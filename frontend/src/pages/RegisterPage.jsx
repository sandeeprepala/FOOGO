import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ROLES } from '../constants';
import { UtensilsCrossed, ArrowRight } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || ROLES.CUSTOMER;

  const { register } = useAuth();
  const { addToast } = useNotification();

  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [address, setAddress] = useState('');
  const [cuisineType, setCuisineType] = useState('Italian');
  const [numberPlate, setNumberPlate] = useState('');
  const [licenceNo, setLicenceNo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let payload = { name, password, phone_no: phoneNo };
      if (role === ROLES.CUSTOMER) {
        payload = { ...payload, email, address, lat: 28.6139, lng: 77.2090 };
      } else if (role === ROLES.RESTAURANT) {
        payload = { ...payload, email, address, cuisine_type: cuisineType, lat: 28.6120, lng: 77.2100 };
      } else if (role === ROLES.DELIVERY_AGENT) {
        payload = { ...payload, number_plate: numberPlate, licence_no: licenceNo, lat: 28.6150, lng: 77.2150 };
      }

      await register(role, payload);
      addToast('Account created successfully!', 'success');
      if (role === ROLES.RESTAURANT) navigate('/restaurant-dashboard');
      else if (role === ROLES.DELIVERY_AGENT) navigate('/agent-dashboard');
      else navigate('/');
    } catch (err) {
      addToast(err.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-primary-olive text-white flex items-center justify-center mx-auto shadow-soft">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-forest-green">Join FOO GO</h1>
        <p className="text-xs text-muted-sage font-medium">Create your account as a customer, merchant, or delivery partner.</p>
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
        <div>
          <label className="block text-xs font-bold text-forest-green mb-1">Full Name / Business Name</label>
          <input
            type="text"
            required
            placeholder="John Doe or Pizza Place"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
          />
        </div>

        {role !== ROLES.DELIVERY_AGENT && (
          <div>
            <label className="block text-xs font-bold text-forest-green mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-forest-green mb-1">Phone Number</label>
          <input
            type="text"
            required
            placeholder="+91 9999999999"
            value={phoneNo}
            onChange={(e) => setPhoneNo(e.target.value)}
            className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
          />
        </div>

        {role === ROLES.RESTAURANT && (
          <div>
            <label className="block text-xs font-bold text-forest-green mb-1">Cuisine Specialty</label>
            <input
              type="text"
              required
              placeholder="Italian, Organic, Indian"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
            />
          </div>
        )}

        {role === ROLES.DELIVERY_AGENT && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-forest-green mb-1">Number Plate</label>
              <input
                type="text"
                required
                placeholder="DL01AB1234"
                value={numberPlate}
                onChange={(e) => setNumberPlate(e.target.value)}
                className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-forest-green mb-1">Driving Licence</label>
              <input
                type="text"
                required
                placeholder="LIC-12345"
                value={licenceNo}
                onChange={(e) => setLicenceNo(e.target.value)}
                className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
              />
            </div>
          </div>
        )}

        {(role === ROLES.CUSTOMER || role === ROLES.RESTAURANT) && (
          <div>
            <label className="block text-xs font-bold text-forest-green mb-1">Address</label>
            <input
              type="text"
              required
              placeholder="Market Road 4, Green Park"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 bg-card-sage border border-border-light rounded-2xl text-sm focus:outline-none focus:ring-1 focus:ring-primary-olive"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-forest-green mb-1">Password</label>
          <input
            type="password"
            required
            placeholder="••••••••"
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
          <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="text-center text-xs text-muted-sage">
        Already registered?{' '}
        <Link to="/login" className="text-primary-olive font-bold hover:underline">
          Sign In Here
        </Link>
      </p>
    </div>
  );
}
