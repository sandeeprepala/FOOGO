# 🚀 Food Delivery System - Complete Microservices Backend

A real-time food delivery platform (Swiggy/Zomato-like) built with **true microservices architecture**. Each service is independently runnable, deployable, and testable.

## 📋 System Overview

### Architecture
- **3 Independent API Gateways** (customer-facing, restaurant-facing, delivery-agent-facing)
- **11 Standalone Microservices** (user, restaurant, cart, order, payment, rest-order, notification, delivery-agent-matching, location-update, delivery, each with own db/redis/kafka client)
- **Event-Driven via Kafka** (order lifecycle, status updates, notifications)
- **Real-time via WebSockets** (live tracking, restaurant notifications, agent broadcasts)
- **Distributed Storage**: Supabase PostgreSQL + Upstash Redis

### Core Services
| Service | Responsibility |
|---------|-----------------|
| `user-service` | Auth (register/login/logout) for customers, restaurants, delivery agents |
| `restaurant-service` | Restaurant profiles, menu CRUD, nearby-restaurant search (Haversine) |
| `cart-service` | Cart management (add/remove items, checkout trigger) |
| `order-service` | Order orchestration, status lifecycle, Kafka event coordination |
| `payment-service` | Dummy payment processing, success/failure events to Kafka |
| `rest-order-service` | Restaurant order management, WebSocket notifications, accept/reject handling |
| `delivery-agent-matching-service` | Nearby agent search, Redis-based concurrency locking, agent broadcasting |
| `location-update-service` | GPS ping ingestion, Redis hot-path, Postgres batch sync, live customer tracking |
| `delivery-service` | Agent status updates (picked up, on the way, delivered) |
| `notification-service` | Event consumer, stubbed notification sender |
| `api-gateway-customer`, `api-gateway-restaurant`, `api-gateway-delivery` | Express reverse proxies, JWT auth, routing |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (all services use plain JavaScript)
- **Docker & Docker Compose** (for Kafka + Zookeeper)
- **External services** (already set up):
  - Supabase PostgreSQL: `https://nkvnnmyddwmxntsauqgz.supabase.co`
  - Upstash Redis: `rediss://default:...@immortal-dove-142947.upstash.io:6379`

### 1. Run Database Migration
Log into Supabase SQL editor and run the entire SQL from `supabase-migration.sql`:
```bash
# Open: https://app.supabase.com/project/nkvnnmyddwmxntsauqgz/sql/new
# Paste entire contents of supabase-migration.sql and execute
```

### 2. Start Kafka Broker
```bash
docker-compose up -d
# Kafka + Zookeeper will start on localhost:9092
```

### 3. Run Each Service Independently
In separate terminals, from the root folder:

```bash
cd user-service && npm install && npm run dev
cd restaurant-service && npm install && npm run dev
cd cart-service && npm install && npm run dev
cd order-service && npm install && npm run dev
cd payment-service && npm install && npm run dev
cd rest-order-service && npm install && npm run dev
cd delivery-agent-matching-service && npm install && npm run dev
cd location-update-service && npm install && npm run dev
cd delivery-service && npm install && npm run dev
cd notification-service && npm install && npm run dev
cd api-gateway-customer && npm install && npm run dev
cd api-gateway-restaurant && npm install && npm run dev
cd api-gateway-delivery && npm install && npm run dev
```

**OR** run all at once (if you have `concurrently` installed globally):
```bash
npm run dev:all
```

### 4. Test the System
```bash
# Register a customer
curl -X POST http://localhost:3001/auth/register/customer \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice", "email": "alice@example.com", "password": "secret",
    "phone_no": "9876543210", "address": "123 Main St", "lat": 28.6139, "lng": 77.2090
  }'

# Register a restaurant
curl -X POST http://localhost:3002/auth/register/restaurant \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Palace", "email": "pizza@example.com", "password": "secret",
    "phone_no": "9999999999", "address": "456 Restaurant Ave", "lat": 28.6200, "lng": 77.2200,
    "cuisine_type": "Italian"
  }'

# Search nearby restaurants (as customer from localhost:3001)
curl http://localhost:3001/restaurants/nearby?lat=28.6139&lng=77.2090
```

---

## 🏗️ Project Structure

```
food-delivery-system/
│
├── supabase-migration.sql              # Single SQL file, run once in Supabase
├── docker-compose.yml                  # Kafka + Zookeeper (Postgres & Redis are external)
├── package.json                        # Root, for running all services with concurrently
│
├── user-service/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── redis.js
│   ├── authMiddleware.js
│   └── routes/
│       └── auth.js
│
├── restaurant-service/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── redis.js
│   ├── kafka.js
│   ├── authMiddleware.js
│   └── routes/
│       ├── restaurant.js
│       └── search.js
│
├── cart-service/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── authMiddleware.js
│   └── routes/
│       └── cart.js
│
├── order-service/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── redis.js
│   ├── kafka.js
│   ├── authMiddleware.js
│   └── routes/
│       └── order.js
│
├── payment-service/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── kafka.js
│   └── routes/
│       └── payment.js
│
├── rest-order-service/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── kafka.js
│   ├── ws.js (WebSocket manager)
│   ├── authMiddleware.js
│   └── routes/
│       └── restaurant-order.js
│
├── delivery-agent-matching-service/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── redis.js
│   ├── kafka.js
│   ├── ws.js (WebSocket manager)
│   └── routes/
│       └── matching.js
│
├── location-update-service/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── redis.js
│   ├── kafka.js
│   ├── ws.js (WebSocket manager)
│   └── routes/
│       └── location.js
│
├── delivery-service/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── authMiddleware.js
│   └── routes/
│       └── delivery.js
│
├── notification-service/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── db.js
│   ├── kafka.js
│   └── index.js (main consumer loop)
│
├── api-gateway-customer/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   └── authMiddleware.js
│
├── api-gateway-restaurant/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   └── authMiddleware.js
│
└── api-gateway-delivery/
    ├── package.json
    ├── .env.example
    ├── server.js
    └── authMiddleware.js
```

---

## 🔄 Order Lifecycle (Kafka Event Flow)

1. **Customer checks out** → `order-service` creates order (status: `pending_payment`)
2. **Produce** `order.created` event
3. `payment-service` **consumes**, runs dummy payment
4. **Produce** `payment.completed` {success/failed}
5. `order-service` **consumes**:
   - **Success**: status → `placed`, **produce** `order.confirmed`
   - **Failed**: status → `payment_failed`, notify customer, STOP
6. `rest-order-service` **consumes** `order.confirmed`
   - Pushes order to restaurant via **WebSocket** (subscribers to `restaurant:{restaurantId}`)
   - Restaurant calls `PATCH /orders/:id/accept` or `/reject`
   - **Produce** `restaurant.accepted` or `restaurant.rejected`
7. `delivery-agent-matching-service` **consumes** `restaurant.accepted`
   - Query nearby agents within 5km
   - Broadcast order via **WebSocket** to `agent:available` room
   - **FIRST agent to call** `POST /orders/:id/accept-delivery` wins
   - **Redis SETNX** lock (`order:lock:{orderId}`) prevents race conditions
   - Loser agents get "already taken" WebSocket message
   - **Produce** `agent.assigned`
8. `location-update-service` **consumes** agent GPS pings
   - Writes to Redis: `agent:location:{agentId}` (30s TTL)
   - Every 30s, batch-sync to Postgres `delivery_tracking` table
   - **Push** live lat/lng to customer via **WebSocket** (subscribers to `order:{orderId}`)
9. `delivery-service` handles agent status updates (picked up, on the way, delivered)
10. `notification-service` **consumes all events**, logs/stubs notifications

---

## 🔐 Authentication Flow

### Register (per role)
**Endpoint**: `POST /auth/register/{role}` (role = `customer` | `restaurant` | `delivery_agent`)

**Customer & Restaurant payload**:
```json
{
  "name": "string",
  "email": "string",
  "password": "string (plain, hashed server-side with bcrypt)",
  "phone_no": "string",
  "address": "string",
  "lat": "number",
  "lng": "number",
  "cuisine_type": "string (restaurant only)"
}
```

**Delivery Agent payload**:
```json
{
  "name": "string",
  "phone_no": "string",
  "password": "string",
  "number_plate": "string",
  "licence_no": "string",
  "lat": "number",
  "lng": "number"
}
```

### Login
**Endpoint**: `POST /auth/login`

```json
{
  "email": "string (optional for delivery agents, they use phone_no)",
  "phone_no": "string (optional for customers/restaurants, or used as backup)",
  "password": "string",
  "role": "customer" | "restaurant" | "delivery_agent"
}
```

**Response**:
```json
{
  "success": true,
  "accessToken": "jwt...",
  "refreshToken": "jwt...",
  "user": { "id", "name", "role", "lat", "lng", ... }
}
```

### Logout
**Endpoint**: `POST /auth/logout` (requires valid JWT)

- Adds refresh token to Redis blacklist with TTL = remaining token lifetime
- Subsequent requests with blacklisted token fail

---

## 📍 Nearby Search (Haversine Formula)

**Endpoint**: `GET /restaurants/nearby?lat=28.6139&lng=77.2090&radius_km=10`

**SQL Query** (uses Haversine formula, no PostGIS needed):
```sql
SELECT * FROM restaurants
WHERE is_open = true
AND ( 6371 * acos(
  cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?))
  + sin(radians(?)) * sin(radians(lat))
)) <= ?
ORDER BY distance ASC
LIMIT 50;
```

- `?` = customer lat, lng, lat again, and radius_km
- Result = all open restaurants within N km, sorted by distance

---

## 🔴 Redis Usage Patterns

### 1. Order-Agent Assignment Lock (Critical for Concurrency)
When multiple agents race to accept the same order:
```javascript
// Set only if key doesn't exist (NX), 30-second expiry (EX 30)
// SETNX order:lock:{orderId} {agentId} EX 30
// If success → this agent won, update order status
// If failed → another agent won, reject with "order already taken"
```

### 2. Live Delivery Agent Location
On every GPS ping from agent:
```javascript
// Overwrite previous location, 30-second expiry
// SET agent:location:{agentId} "{lat},{lng}" EX 30
// If key is missing = agent went offline
```

### 3. JWT Token Blacklist (on logout)
```javascript
// Denylist the refresh token so it can't be used to get new access tokens
// SET blacklist:{tokenId} true EX {remainingTokenTTL}
```

---

## 🔌 WebSocket Channels

### Customer Channel
**URL**: `ws://localhost:3001/orders/{orderId}`

**Incoming Messages** (from server):
- `restaurant.accepted` → `{ event: "order_accepted_by_restaurant", restaurant_name, phone }`
- `restaurant.rejected` → `{ event: "order_rejected", reason }`
- `agent.assigned` → `{ event: "agent_assigned", agent_name, phone, vehicle_no }`
- `status.update` → `{ event: "status_update", status, timestamp }`
- `location.update` → `{ event: "live_location", lat, lng, updated_at }`

### Restaurant Channel
**URL**: `ws://localhost:3002/restaurant/{restaurantId}`

**Incoming Messages**:
- `new.order` → `{ event: "new_order", orderId, customer_name, items, delivery_address, total }`

**Outgoing Messages** (from restaurant):
- `{ action: "accept_order", orderId }`
- `{ action: "reject_order", orderId, reason }`

### Delivery Agent Channel
**URL**: `ws://localhost:3003/agent/{agentId}`

**Incoming Messages**:
- `order.broadcast` → `{ event: "new_nearby_order", orderId, restaurant_name, items, customer_address, lat, lng, distance_km }`

**Outgoing Messages** (from agent):
- `{ action: "accept_delivery", orderId }`

---

## 🧪 API Endpoints Summary

### Auth (all via user-service, proxied by gateways)
```
POST   /auth/register/{role}
POST   /auth/login
POST   /auth/logout (requires JWT)
POST   /auth/refresh (takes refresh token, returns new access token)
```

### Restaurants
```
GET    /restaurants/nearby?lat=X&lng=Y&radius=10
GET    /restaurants/:restaurantId
GET    /restaurants/:restaurantId/menu
POST   /restaurants/:restaurantId/menu (add item)
PATCH  /restaurants/:restaurantId/menu/:itemId (update item)
DELETE /restaurants/:restaurantId/menu/:itemId
PATCH  /restaurants/:restaurantId/status (open/close)
```

### Cart
```
POST   /cart (create/get cart for user)
GET    /cart (get current cart)
POST   /cart/add (add item: { menu_item_id, quantity })
DELETE /cart/:itemId (remove from cart)
DELETE /cart (clear cart)
POST   /cart/checkout (creates order, triggers payment flow)
```

### Orders
```
POST   /orders/checkout (creates order from cart)
GET    /orders/:orderId (customer or restaurant can view)
PATCH  /orders/:orderId/accept (restaurant accepts)
PATCH  /orders/:orderId/reject (restaurant rejects)
POST   /orders/:orderId/accept-delivery (delivery agent accepts)
PATCH  /orders/:orderId/status (agent updates: picked_up, on_the_way, delivered)
GET    /orders (customer can list their orders, restaurant can list incoming)
```

### Location
```
POST   /location/update ({ lat, lng }) (delivery agent sends GPS ping)
GET    /orders/:orderId/track (customer polls/subscribes live location)
```

---

## 📦 Environment Variables

Every service needs a `.env` file (template provided in `.env.example`):

```bash
# Shared across all services (Supabase & Redis are external, not containerized)
SUPABASE_URL=https://your_secret.supabase.co
SUPABASE_SECRET_KEY=your_secret

REDIS_URL=rediss://default:gQAAAAAAAi5jAAIgcDFhMTdjZWY3NWY4ZGU0OThjYjI5N2ViODRmYjlkMTU1Yg@immortal-dove-142947.upstash.io:6379

KAFKA_BROKER=localhost:9092

JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Service-specific ports
USER_SERVICE_PORT=3010
RESTAURANT_SERVICE_PORT=3011
CART_SERVICE_PORT=3012
ORDER_SERVICE_PORT=3013
PAYMENT_SERVICE_PORT=3014
REST_ORDER_SERVICE_PORT=3015
DELIVERY_AGENT_MATCHING_PORT=3016
LOCATION_UPDATE_SERVICE_PORT=3017
DELIVERY_SERVICE_PORT=3018
NOTIFICATION_SERVICE_PORT=3019

# API Gateways
API_GATEWAY_CUSTOMER_PORT=3001
API_GATEWAY_RESTAURANT_PORT=3002
API_GATEWAY_DELIVERY_PORT=3003
```

---

## 🧩 Key Design Decisions

1. **No Shared Code**: Every service has its own `db.js`, `redis.js`, `kafka.js`, `authMiddleware.js`. Yes, there's duplication — that's the price of true service independence. You can delete a service without affecting others.

2. **Event-Driven**: Services don't call each other directly (except for REST lookups like "get restaurant by ID"). They communicate via **Kafka events**, ensuring loose coupling.

3. **WebSockets for Real-time**: Live tracking, restaurant notifications, agent broadcasts use WebSockets for low-latency updates (not Kafka, which would add ~1s latency).

4. **Redis for Hot Path**: Delivery agent locations are written to Redis every 10s for customer tracking (instant), then batch-synced to Postgres every 30s for historical records.

5. **Haversine in SQL**: No PostGIS complexity. The raw Haversine formula works fine for small radius searches and keeps the schema simple.

6. **Dummy Payment**: Payment service always returns success or failure randomly — no real payment gateway integration.

7. **Simple Auth**: Custom JWT (bcrypt + JWT secret), not Supabase Auth. Services verify tokens locally using the shared `JWT_SECRET`.

8. **Concurrency Control**: Redis `SETNX` (Set If Not eXists) is used for order-agent assignment to prevent two agents accidentally claiming the same order.

---

## 🚦 Running in Production (High-Level)

1. Deploy each service as a separate container to AKS or similar
2. Use managed Kafka (Azure Event Hubs or Confluent Cloud) instead of local Docker Compose
3. Use managed Postgres (Azure Database for PostgreSQL) and Redis (Azure Cache for Redis) or Upstash
4. Add observability: structured logging (Winston/Pino), tracing (Datadog/OpenTelemetry)
5. Add API Gateway: Kong, Traefik, or cloud-native option
6. Add auth: Consider OAuth2/OIDC for additional security
7. Scale services independently based on load (order-service and location-update-service will see most traffic)

---

## 📝 Troubleshooting

### "Connection refused to Kafka"
- Make sure Kafka is running: `docker ps` should show `kafka` and `zookeeper`
- Restart: `docker-compose down && docker-compose up -d`

### "Supabase connection failed"
- Verify `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in `.env`
- Check internet connectivity
- Confirm database is available in Supabase dashboard

### "Redis connection failed"
- Verify `REDIS_URL` format (should start with `rediss://` for TLS)
- Check Upstash dashboard to confirm the instance is running

### "JWT token invalid"
- Ensure `JWT_SECRET` is the **same** across all services
- Check token expiry: access tokens expire after 15min, refresh tokens after 7 days
- Logout removes token from Redis (blacklist), so re-login if needed

### WebSocket connection drops
- Normal for long-lived connections; implement auto-reconnect on client side
- Server sends heartbeat pings every 30s to detect dead connections

---

## 📚 References

- **Express.js**: https://expressjs.com
- **Supabase**: https://supabase.com/docs
- **Upstash Redis**: https://upstash.com/docs
- **Kafka.js**: https://kafka.js.org
- **socket.io**: https://socket.io/docs
- **JWT**: https://jwt.io
- **Haversine Formula**: https://en.wikipedia.org/wiki/Haversine_formula

---

**Happy building! 🎉**
