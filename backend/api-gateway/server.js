// ============================================================================
// api-gateway/server.js - API Gateway with Auth & Reverse Proxy
// ============================================================================
// Routes requests to appropriate backend services
// Handles JWT verification for protected routes

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = process.env.CUSTOMER_GATEWAY_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in .env');
}

const app = express();

// Redis for token blacklist
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'api-gateway' });
});

// ============================================================================
// JWT VERIFICATION MIDDLEWARE
// ============================================================================
/**
 * Verify JWT token and check if it's blacklisted
 * Attaches user info to req.user if valid
 */
const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.substring(7);

    // Check Redis blacklist
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked',
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ============================================================================
// AUTH ROUTES - No protection needed (public)
// ============================================================================

// Proxy to user-service auth endpoints (no JWT required)
app.use(
  '/auth',
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/auth': '/auth' },
    onProxyReq: (proxyReq, req, res) => {
      // If body was parsed by express.json(), forward it to the target service
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(503).json({ success: false, message: 'User service unavailable' });
    },
  })
);

// ============================================================================
// PROTECTED ROUTES - Require JWT
// ============================================================================

// Restaurant routes (protected, customer-facing)
app.use(
  '/restaurants',
  verifyJWT,
  createProxyMiddleware({
    target: process.env.RESTAURANT_SERVICE_URL,
    changeOrigin: true,
    // Strip the `/restaurants` prefix when proxying because the restaurant
    // service registers routes at the root (e.g. GET /nearby).
    pathRewrite: { '^/restaurants': '' },
    onProxyReq: (proxyReq, req, res) => {
      // Log proxied path for debugging
      try {
        console.log('[gateway] proxying to restaurant service path:', proxyReq.path || proxyReq.pathName || proxyReq.getHeader('path'));
      } catch (e) {
        console.log('[gateway] proxying to restaurant service (path unavailable)');
      }
      // Forward parsed JSON bodies if present
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(503).json({ success: false, message: 'Restaurant service unavailable' });
    },
  })
);

// Cart routes (protected, customer only)
app.use(
  '/cart',
  verifyJWT,
  (req, res, next) => {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Only customers can access cart' });
    }
    next();
  },
  createProxyMiddleware({
    target: process.env.CART_SERVICE_URL,
    changeOrigin: true,
    // Strip the `/cart` prefix because cartService registers routes at root
    pathRewrite: { '^/cart': '' },
    onProxyReq: (proxyReq, req, res) => {
      // Log proxied path for debugging
      try {
        console.log('[gateway] proxying to cart service path:', proxyReq.path || proxyReq.pathName || proxyReq.getHeader('path'));
      } catch (e) {
        console.log('[gateway] proxying to cart service (path unavailable)');
      }
      // Forward parsed JSON bodies if present (express.json() consumed the stream)
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(503).json({ success: false, message: 'Cart service unavailable' });
    },
  })
);

// Orders routes (protected)
app.use(
  '/orders',
  verifyJWT,
  createProxyMiddleware({
    target: process.env.ORDER_SERVICE_URL,
    changeOrigin: true,
    // Strip the `/orders` prefix because orderService registers routes at root
    pathRewrite: { '^/orders': '' },
    onProxyReq: (proxyReq, req, res) => {
      // Log proxied path for debugging
      try {
        console.log('[gateway] proxying to order service path:', proxyReq.path || proxyReq.getHeader('path'));
      } catch (e) {
        console.log('[gateway] proxying to order service (path unavailable)');
      }
      // Forward parsed JSON bodies if present
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
      // Forward authenticated user info to downstream services
      if (req.user) {
        try {
          proxyReq.setHeader('x-user-id', String(req.user.id));
          proxyReq.setHeader('x-user-role', String(req.user.role));
        } catch (e) {
          /* ignore header set errors */
        }
      }
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(503).json({ success: false, message: 'Order service unavailable' });
    },
  })
);

// Location updates (protected, delivery agents only)
app.use(
  '/location',
  verifyJWT,
  (req, res, next) => {
    if (req.user.role !== 'delivery_agent') {
      return res.status(403).json({ success: false, message: 'Only delivery agents can update location' });
    }
    next();
  },
  createProxyMiddleware({
    target: process.env.LOCATION_UPDATE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/location': '/location' },
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(503).json({ success: false, message: 'Location service unavailable' });
    },
  })
);

// Delivery routes (protected, delivery agents only)
app.use(
  '/delivery',
  verifyJWT,
  (req, res, next) => {
    if (req.user.role !== 'delivery_agent') {
      return res.status(403).json({ success: false, message: 'Only delivery agents can access delivery routes' });
    }
    next();
  },
  createProxyMiddleware({
    target: process.env.DELIVERY_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/delivery': '/delivery' },
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(503).json({ success: false, message: 'Delivery service unavailable' });
    },
  })
);

// Restaurant-order routes (for restaurants to poll orders via HTTP)
app.use(
  '/restaurant-orders',
  verifyJWT,
  (req, res, next) => {
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ success: false, message: 'Only restaurants can access restaurant orders' });
    }
    next();
  },
  createProxyMiddleware({
    target: process.env.REST_ORDER_SERVICE_URL,
    changeOrigin: true,
    // strip prefix so /restaurant-orders/restaurant/1/orders -> /restaurant/1/orders
    pathRewrite: { '^/restaurant-orders': '' },
    onProxyReq: (proxyReq, req, res) => {
      try {
        console.log('[gateway] proxying to rest-order-service path:', proxyReq.path || proxyReq.getHeader('path'));
      } catch (e) {
        console.log('[gateway] proxying to rest-order-service (path unavailable)');
      }
      if (req.body && Object.keys(req.body).length) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(503).json({ success: false, message: 'Restaurant-order service unavailable' });
    },
  })
);

// ============================================================================
// ROOT & 404
// ============================================================================

app.get('/', (req, res) => {
  res.status(200).json({
    gateway: 'api-gateway (customer-facing)',
    version: '1.0.0',
    publicRoutes: [
      'POST /auth/register/:role',
      'POST /auth/login',
      'POST /auth/refresh',
    ],
    protectedRoutes: [
      'POST /auth/logout',
      'GET /restaurants/nearby?lat=X&lng=Y',
      'POST /cart',
      'GET /cart',
      'POST /orders/checkout',
      'POST /location/update (delivery agents)',
      'PATCH /delivery/:orderId/status (delivery agents)',
    ],
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((error, req, res, next) => {
  console.error('💥 Gateway error:', error.message);
  res.status(500).json({
    success: false,
    message: 'Gateway error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

// ============================================================================
// START GATEWAY
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                     🚪 API GATEWAY Started on ${PORT}                           ║
║                                                                            ║
║  Public Routes:                                                            ║
║    POST /auth/register/:role                                              ║
║    POST /auth/login                                                       ║
║    POST /auth/refresh                                                     ║
║                                                                            ║
║  Protected Routes: (Requires JWT Bearer token)                            ║
║    GET  /restaurants/nearby                                               ║
║    GET  /cart                                                             ║
║    POST /orders/checkout                                                  ║
║    POST /location/update                                                  ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down api-gateway...');
  process.exit(0);
});
