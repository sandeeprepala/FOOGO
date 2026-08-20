import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('foogo_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('foogo_token') || null);

  // BACKEND GAP: Favorites stored in client localStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('foogo_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // BACKEND GAP: Addresses stored in client state
  const [addresses, setAddresses] = useState(() => {
    try {
      const saved = localStorage.getItem('foogo_addresses');
      return saved ? JSON.parse(saved) : [
        {
          id: 'default-addr',
          title: 'Home',
          address: 'Green Park, Main Market, New Delhi',
          lat: 28.6139,
          lng: 77.2090,
          isDefault: true
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('foogo_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('foogo_addresses', JSON.stringify(addresses));
  }, [addresses]);

  // Listen for auth expiry events dispatched by apiClient when refresh fails
  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('foogo_user');
    };
    window.addEventListener('foogo:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('foogo:auth-expired', handleAuthExpired);
  }, []);

  const login = async (role, credentials) => {
    const data = await authService.login(role, credentials);
    if (data?.accessToken) {
      localStorage.setItem('foogo_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('foogo_refresh_token', data.refreshToken);
      }
      const userData = data.user || { role, email: credentials.email };
      localStorage.setItem('foogo_user', JSON.stringify(userData));
      setToken(data.accessToken);
      setUser(userData);
    }
    return data;
  };

  const register = async (role, userData) => {
    const data = await authService.register(role, userData);
    if (data?.accessToken) {
      localStorage.setItem('foogo_token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('foogo_refresh_token', data.refreshToken);
      }
      const u = data.user || { role, name: userData.name, email: userData.email };
      localStorage.setItem('foogo_user', JSON.stringify(u));
      setToken(data.accessToken);
      setUser(u);
    }
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
  };

  const toggleFavorite = (restaurantId) => {
    setFavorites(prev => 
      prev.includes(restaurantId) 
        ? prev.filter(id => id !== restaurantId) 
        : [...prev, restaurantId]
    );
  };

  const updateUserAddress = (newAddressText, lat = 28.6139, lng = 77.2090) => {
    setUser(prev => {
      const updated = { ...prev, address: newAddressText, lat, lng };
      localStorage.setItem('foogo_user', JSON.stringify(updated));
      return updated;
    });

    setAddresses(prev => {
      if (prev && prev.length > 0) {
        return prev.map((a, idx) => idx === 0 ? { ...a, address: newAddressText, lat, lng } : a);
      }
      return [{
        id: 'default-addr',
        title: 'Primary Address',
        address: newAddressText,
        lat,
        lng,
        isDefault: true
      }];
    });
  };

  const updateAddress = (addressId, updatedData) => {
    setAddresses(prev => prev.map(a => a.id === addressId ? { ...a, ...updatedData } : a));
  };

  const setDefaultAddress = (addressId) => {
    setAddresses(prev => {
      const target = prev.find(a => a.id === addressId);
      if (target) {
        setUser(u => {
          const updated = { ...u, address: target.address, lat: target.lat, lng: target.lng };
          localStorage.setItem('foogo_user', JSON.stringify(updated));
          return updated;
        });
      }
      return prev.map(a => ({
        ...a,
        isDefault: a.id === addressId
      }));
    });
  };

  const addAddress = (newAddr) => {
    setAddresses(prev => [...prev, { ...newAddr, id: `addr-${Date.now()}` }]);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      login,
      register,
      logout,
      favorites,
      toggleFavorite,
      addresses,
      addAddress,
      updateUserAddress,
      updateAddress,
      setDefaultAddress
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
