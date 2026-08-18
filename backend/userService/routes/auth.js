// ============================================================================
// routes/auth.js - Authentication Endpoints
// ============================================================================
// Handles registration, login, logout for all 3 user types

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../db');
const redis = require('../redis');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// ============================================================================
// REGISTER - POST /auth/register/:role
// ============================================================================
router.post('/register/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const { name, email, password, phone_no, address, lat, lng, cuisine_type, number_plate, licence_no } = req.body;

    // ===== CUSTOMER REGISTRATION =====
    if (role === 'customer') {
      if (!name || !email || !password || !phone_no || !address || lat === undefined || lng === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Customer registration requires: name, email, password, phone_no, address, lat, lng',
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const { data, error } = await supabase
        .from('customers')
        .insert([{ name, email, password_hash: passwordHash, phone_no, address, lat: parseFloat(lat), lng: parseFloat(lng) }])
        .select();

      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      const user = data[0];
      const accessToken = jwt.sign({ id: user.id, email: user.email, role: 'customer' }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
      const refreshToken = jwt.sign({ id: user.id, email: user.email, role: 'customer' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });

      return res.status(201).json({
        success: true,
        message: 'Customer registered successfully',
        user: { id: user.id, name: user.name, email: user.email, role: 'customer', phone_no: user.phone_no, lat: user.lat, lng: user.lng },
        accessToken,
        refreshToken,
      });
    }

    // ===== RESTAURANT REGISTRATION =====
    if (role === 'restaurant') {
      if (!name || !email || !password || !phone_no || !address || lat === undefined || lng === undefined || !cuisine_type) {
        return res.status(400).json({
          success: false,
          message: 'Restaurant registration requires: name, email, password, phone_no, address, lat, lng, cuisine_type',
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const { data, error } = await supabase
        .from('restaurants')
        .insert([{ name, email, password_hash: passwordHash, phone_no, address, lat: parseFloat(lat), lng: parseFloat(lng), cuisine_type, is_open: true }])
        .select();

      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      const user = data[0];
      const accessToken = jwt.sign({ id: user.id, email: user.email, role: 'restaurant' }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
      const refreshToken = jwt.sign({ id: user.id, email: user.email, role: 'restaurant' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });

      return res.status(201).json({
        success: true,
        message: 'Restaurant registered successfully',
        user: { id: user.id, name: user.name, email: user.email, role: 'restaurant', phone_no: user.phone_no, cuisine_type: user.cuisine_type, lat: user.lat, lng: user.lng },
        accessToken,
        refreshToken,
      });
    }

    // ===== DELIVERY AGENT REGISTRATION =====
    if (role === 'delivery_agent') {
      if (!name || !phone_no || !password || !number_plate || !licence_no || lat === undefined || lng === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Delivery agent registration requires: name, phone_no, password, number_plate, licence_no, lat, lng',
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const { data, error } = await supabase
        .from('delivery_agents')
        .insert([{ name, phone_no, password_hash: passwordHash, number_plate, licence_no, lat: parseFloat(lat), lng: parseFloat(lng), is_available: true }])
        .select();

      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      const user = data[0];
      const accessToken = jwt.sign({ id: user.id, phone_no: user.phone_no, role: 'delivery_agent' }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
      const refreshToken = jwt.sign({ id: user.id, phone_no: user.phone_no, role: 'delivery_agent' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });

      return res.status(201).json({
        success: true,
        message: 'Delivery agent registered successfully',
        user: { id: user.id, name: user.name, role: 'delivery_agent', phone_no: user.phone_no, lat: user.lat, lng: user.lng },
        accessToken,
        refreshToken,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid role. Must be: customer, restaurant, or delivery_agent',
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
});

// ============================================================================
// LOGIN - POST /auth/login
// ============================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, phone_no, password, role } = req.body;

    if (!password || !role) {
      return res.status(400).json({
        success: false,
        message: 'password and role are required',
      });
    }

    // ===== CUSTOMER LOGIN =====
    if (role === 'customer') {
      if (!email) {
        return res.status(400).json({ success: false, message: 'email is required for customer login' });
      }

      const { data, error } = await supabase.from('customers').select('*').eq('email', email).single();

      if (error || !data) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, data.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const accessToken = jwt.sign({ id: data.id, email: data.email, role: 'customer' }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
      const refreshToken = jwt.sign({ id: data.id, email: data.email, role: 'customer' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: { id: data.id, name: data.name, email: data.email, role: 'customer', lat: data.lat, lng: data.lng },
        accessToken,
        refreshToken,
      });
    }

    // ===== RESTAURANT LOGIN =====
    if (role === 'restaurant') {
      if (!email) {
        return res.status(400).json({ success: false, message: 'email is required for restaurant login' });
      }

      const { data, error } = await supabase.from('restaurants').select('*').eq('email', email).single();

      if (error || !data) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, data.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const accessToken = jwt.sign({ id: data.id, email: data.email, role: 'restaurant' }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
      const refreshToken = jwt.sign({ id: data.id, email: data.email, role: 'restaurant' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: { id: data.id, name: data.name, email: data.email, role: 'restaurant', lat: data.lat, lng: data.lng },
        accessToken,
        refreshToken,
      });
    }

    // ===== DELIVERY AGENT LOGIN =====
    if (role === 'delivery_agent') {
      if (!phone_no) {
        return res.status(400).json({ success: false, message: 'phone_no is required for delivery_agent login' });
      }

      const { data, error } = await supabase.from('delivery_agents').select('*').eq('phone_no', phone_no).single();

      if (error || !data) {
        return res.status(401).json({ success: false, message: 'Invalid phone_no or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, data.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid phone_no or password' });
      }

      const accessToken = jwt.sign({ id: data.id, phone_no: data.phone_no, role: 'delivery_agent' }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
      const refreshToken = jwt.sign({ id: data.id, phone_no: data.phone_no, role: 'delivery_agent' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: { id: data.id, name: data.name, role: 'delivery_agent', phone_no: data.phone_no, lat: data.lat, lng: data.lng },
        accessToken,
        refreshToken,
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid role' });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
});

// ============================================================================
// LOGOUT - POST /auth/logout
// ============================================================================
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Token required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.exp) {
      return res.status(400).json({ success: false, message: 'Invalid token format' });
    }

    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;

    if (ttl <= 0) {
      return res.status(400).json({ success: false, message: 'Token already expired' });
    }

    // Add to Redis blacklist with TTL
    await redis.set(`blacklist:${token}`, 'true', 'EX', ttl);

    res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({ success: false, message: 'Logout failed', error: error.message });
  }
});

// ============================================================================
// REFRESH TOKEN - POST /auth/refresh
// ============================================================================
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken is required' });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email || decoded.phone_no, role: decoded.role },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRY }
    );

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired, please login again',
      });
    }
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      error: error.message,
    });
  }
});

module.exports = router;
