# AntiGravity Frontend Contract

This document is the frontend contract for the backend API so a frontend app can be generated from it without guessing route structure, payloads, or business behavior.

## Base API

- Gateway base URL: `http://localhost:3001`
- Auth header for protected routes:
  - `Authorization: Bearer <accessToken>`
- Roles supported:
  - `customer`
  - `restaurant`
  - `delivery_agent`

## Authentication and user identity

### Public routes

#### 1) Register user
- Method: `POST`
- Path: `/auth/register/:role`
- Controller purpose: Create a new customer, restaurant, or delivery agent account and return JWT tokens.
- Roles:
  - `customer`
  - `restaurant`
  - `delivery_agent`
- Payload examples:

Customer
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123",
  "phone_no": "+1234567890",
  "address": "Main Street 12",
  "lat": 28.6139,
  "lng": 77.2090
}
```

Restaurant
```json
{
  "name": "Pizza Place",
  "email": "pizza@example.com",
  "password": "secret123",
  "phone_no": "+1234567890",
  "address": "Market Road 4",
  "lat": 28.6120,
  "lng": 77.2100,
  "cuisine_type": "Italian"
}
```

Delivery agent
```json
{
  "name": "Rahul",
  "phone_no": "+9999999999",
  "password": "secret123",
  "number_plate": "DL01AB1234",
  "licence_no": "LIC-12345",
  "lat": 28.6150,
  "lng": 77.2150
}
```

Success response:
```json
{
  "success": true,
  "message": "Customer registered successfully",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  },
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

#### 2) Login
- Method: `POST`
- Path: `/auth/login`
- Controller purpose: Authenticate a user and return access/refresh tokens.
- Payload:
```json
{
  "role": "customer",
  "email": "john@example.com",
  "password": "secret123"
}
```

For delivery agents:
```json
{
  "role": "delivery_agent",
  "phone_no": "+9999999999",
  "password": "secret123"
}
```

#### 3) Refresh token
- Method: `POST`
- Path: `/auth/refresh`
- Controller purpose: Issue a new access token from a valid refresh token.
- Payload:
```json
{
  "refreshToken": "jwt"
}
```

### Protected routes

#### 4) Logout
- Method: `POST`
- Path: `/auth/logout`
- Controller purpose: Blacklist the current access token in Redis.
- Requires: valid JWT
- Headers:
```http
Authorization: Bearer <accessToken>
```

---

## Restaurant browsing

#### 5) Get nearby restaurants
- Method: `GET`
- Path: `/restaurants/nearby?lat=&lng=&radius=`
- Controller purpose: Find open restaurants within a radius from coordinates.
- Requires: JWT
- Query params:
  - `lat`: required
  - `lng`: required
  - `radius`: optional, default `10`
- Response:
```json
{
  "success": true,
  "count": 5,
  "restaurants": [
    {
      "id": "uuid",
      "name": "Pizza Place",
      "email": "pizza@example.com",
      "phone_no": "+123",
      "address": "Market Road 4",
      "lat": 28.612,
      "lng": 77.21,
      "cuisine_type": "Italian",
      "is_open": true,
      "distance_km": 2.4
    }
  ]
}
```

#### 6) Get restaurant details
- Method: `GET`
- Path: `/restaurants/:id`
- Controller purpose: Fetch a restaurant profile.
- Requires: JWT

#### 7) Get restaurant menu
- Method: `GET`
- Path: `/restaurants/:restaurantId/menu`
- Controller purpose: Return all available menu items for a restaurant.
- Requires: JWT
- Response:
```json
{
  "success": true,
  "menu_items": [
    {
      "id": "uuid",
      "restaurant_id": "uuid",
      "name": "Margherita Pizza",
      "description": "Classic cheese pizza",
      "price": 299,
      "category": "pizza",
      "is_available": true
    }
  ]
}
```

#### 8) Add menu item
- Method: `POST`
- Path: `/restaurants/:restaurantId/menu`
- Controller purpose: Add a menu item to the restaurant.
- Requires: JWT
- Payload:
```json
{
  "name": "Burger",
  "description": "Grilled chicken burger",
  "price": 199,
  "category": "main"
}
```

#### 9) Update menu item
- Method: `PATCH`
- Path: `/restaurants/:restaurantId/menu/:itemId`
- Controller purpose: Edit a menu item.
- Requires: JWT
- Payload example:
```json
{
  "name": "Veg Burger",
  "price": 220,
  "is_available": true
}
```

#### 10) Delete menu item
- Method: `DELETE`
- Path: `/restaurants/:restaurantId/menu/:itemId`
- Controller purpose: Remove menu item.
- Requires: JWT

#### 11) Toggle restaurant open/close
- Method: `PATCH`
- Path: `/restaurants/:id/status`
- Controller purpose: Open or close restaurant availability.
- Requires: JWT
- Payload:
```json
{
  "is_open": true
}
```

---

## Cart and checkout

#### 12) Get cart
- Method: `GET`
- Path: `/cart`
- Controller purpose: Return the current customer cart and total.
- Requires: JWT and customer role
- Response:
```json
{
  "success": true,
  "cart": {
    "id": "uuid",
    "restaurant_id": "uuid",
    "customer_id": "uuid"
  },
  "items": [
    {
      "id": "uuid",
      "menu_item_id": "uuid",
      "quantity": 2,
      "price_snapshot": 299,
      "name": "Margherita Pizza"
    }
  ],
  "total": 598
}
```

#### 13) Add item to cart
- Method: `POST`
- Path: `/cart/add`
- Controller purpose: Create a customer cart if needed and add item quantity.
- Requires: JWT and customer role
- Payload:
```json
{
  "restaurant_id": "uuid",
  "menu_item_id": "uuid",
  "quantity": 1
}
```

#### 14) Remove item from cart
- Method: `DELETE`
- Path: `/cart/:itemId`
- Controller purpose: Remove one item entry from the cart.
- Requires: JWT and customer role

#### 15) Clear cart
- Method: `DELETE`
- Path: `/cart`
- Controller purpose: Remove all cart items for the signed-in customer.
- Requires: JWT and customer role

#### 16) Checkout cart
- Method: `POST`
- Path: `/cart/checkout`
- Controller purpose: Create the order, save order items, emit `order.created` Kafka event, and clear the cart.
- Requires: JWT and customer role
- Payload:
```json
{
  "delivery_address": "Green Park, Delhi",
  "delivery_lat": 28.62,
  "delivery_lng": 77.21
}
```
- Success response:
```json
{
  "success": true,
  "message": "Order created, processing payment...",
  "order": {
    "id": "uuid",
    "status": "pending_payment",
    "total_amount": 598
  }
}
```

---

## Order lifecycle

#### 17) Get order by ID
- Method: `GET`
- Path: `/orders/:orderId`
- Controller purpose: Fetch a single order and its items.
- Requires: JWT

#### 18) Get customer orders
- Method: `GET`
- Path: `/orders?customer_id=`
- Controller purpose: List customer order history.
- Requires: JWT

#### 19) Restaurant accepts order
- Method: `PATCH`
- Path: `/orders/:orderId/accept`
- Controller purpose: Marks order as accepted by restaurant and emits `restaurant.accepted` Kafka event.
- Requires: JWT, restaurant role
- Response:
```json
{
  "success": true,
  "message": "Order accepted",
  "order": {
    "id": "uuid",
    "status": "accepted_by_restaurant"
  }
}
```

#### 20) Restaurant rejects order
- Method: `PATCH`
- Path: `/orders/:orderId/reject`
- Controller purpose: Marks order rejected and emits `restaurant.rejected` Kafka event.
- Requires: JWT, restaurant role
- Payload:
```json
{
  "reason": "Kitchen busy"
}
```

#### 21) Update order delivery status
- Method: `PATCH`
- Path: `/orders/:orderId/status`
- Controller purpose: Agent updates delivery progress.
- Requires: JWT and matching delivery_agent
- Allowed statuses:
  - `picked_up`
  - `on_the_way`
  - `delivered`
- Payload:
```json
{
  "status": "on_the_way"
}
```

---

## Restaurant order management (HTTP polling)

#### 22) Get restaurant incoming orders
- Method: `GET`
- Path: `/restaurant-orders/restaurant/:restaurantId/orders`
- Controller purpose: Show active/new orders for a restaurant.
- Requires: JWT, restaurant role
- Response:
```json
{
  "success": true,
  "orders": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "status": "placed",
      "total_amount": 598,
      "delivery_address": "Green Park",
      "created_at": "2026-08-18T12:00:00Z"
    }
  ]
}
```

#### 23) Get restaurant order details
- Method: `GET`
- Path: `/restaurant-orders/orders/:orderId`
- Controller purpose: Inspect one order and order items for restaurant operations.
- Requires: JWT, restaurant role

---

## Delivery and location tracking

#### 24) Update agent location
- Method: `POST`
- Path: `/location/update`
- Controller purpose: Save current agent GPS coordinates in Redis and broadcast live updates to customer tracking sockets.
- Requires: JWT, delivery_agent role
- Payload:
```json
{
  "agent_id": "uuid",
  "lat": 28.621,
  "lng": 77.211,
  "order_id": "uuid"
}
```
- Success response:
```json
{
  "success": true,
  "message": "Location updated"
}
```

#### 25) Get agent location
- Method: `GET`
- Path: `/location/:agentId`
- Controller purpose: Get the latest cached GPS position for an agent.
- Requires: JWT, delivery_agent role

#### 26) Mark order picked up
- Method: `PATCH`
- Path: `/delivery/:orderId/picked-up`
- Controller purpose: Driver confirms pickup from restaurant.
- Requires: JWT, delivery_agent role

#### 27) Mark order on the way
- Method: `PATCH`
- Path: `/delivery/:orderId/on-the-way`
- Controller purpose: Driver confirms the order is in transit.
- Requires: JWT, delivery_agent role

#### 28) Mark order delivered
- Method: `PATCH`
- Path: `/delivery/:orderId/delivered`
- Controller purpose: Driver confirms successful delivery.
- Requires: JWT, delivery_agent role

#### 29) Get active deliveries for an agent
- Method: `GET`
- Path: `/delivery/agent/:agentId/active`
- Controller purpose: Return all active assignment records for a delivery agent.
- Requires: JWT, delivery_agent role

---

## WebSocket realtime flows

These are not REST routes, but they are critical for the frontend.

### Agent assignment broadcast
- Socket: `ws://localhost:3016/agent/:agentId`
- Purpose: the delivery matching service pushes nearby order offers to connected agents.
- Event example:
```json
{
  "event": "nearby_order",
  "orderId": "uuid",
  "restaurantName": "Restaurant",
  "totalAmount": 598,
  "deliveryAddress": "Green Park",
  "deliveryLat": 28.62,
  "deliveryLng": 77.21,
  "timestamp": "2026-08-18T12:00:00Z"
}
```

Agent accepts order by sending:
```json
{
  "action": "accept_delivery",
  "orderId": "uuid"
}
```

Server responds with:
```json
{
  "event": "accepted",
  "orderId": "uuid",
  "message": "You accepted this delivery!"
}
```

### Restaurant order notifications
- Socket: `ws://localhost:3015/restaurant/:restaurantId`
- Purpose: restaurant receives real-time order notifications when a customer order is confirmed.
- Event example:
```json
{
  "event": "new_order",
  "orderId": "uuid",
  "customerName": "Customer",
  "totalAmount": 598,
  "deliveryAddress": "Green Park",
  "timestamp": "2026-08-18T12:00:00Z"
}
```

### Customer tracking socket
- Socket: `ws://localhost:3017/orders/:orderId`
- Purpose: customer receives live delivery agent location.
- Event example:
```json
{
  "event": "live_location",
  "agentId": "uuid",
  "lat": 28.621,
  "lng": 77.211,
  "timestamp": "2026-08-18T12:00:00Z"
}
```

---

## Kafka event flow that affects frontend

The frontend should understand the backend event lifecycle:

1. `order.created`
   - emitted when cart checkout succeeds
2. `payment.completed`
   - emitted after payment processing
3. `order.confirmed`
   - emitted after successful payment
4. `restaurant.accepted`
   - emitted when restaurant accepts the order
5. `restaurant.rejected`
   - emitted when restaurant rejects the order
6. `agent.assigned`
   - emitted when a delivery agent accepts the order
7. `location.updates`
   - used for tracking notifications and live location events

---

## Recommended frontend state model

### Auth state
```ts
{
  user: {
    id: string,
    name: string,
    email?: string,
    phone_no?: string,
    role: 'customer' | 'restaurant' | 'delivery_agent'
  },
  accessToken: string,
  refreshToken: string
}
```

### Cart state
```ts
{
  cart: { id: string, restaurant_id: string, customer_id: string } | null,
  items: Array<{ id: string, menu_item_id: string, quantity: number, price_snapshot: number }>,
  total: number
}
```

### Order state
```ts
{
  id: string,
  customer_id: string,
  restaurant_id: string,
  delivery_agent_id?: string,
  status: string,
  total_amount: number,
  delivery_address: string,
  delivery_lat: number,
  delivery_lng: number
}
```

### UI pages to generate

- Login / Register
- Restaurant list / search nearby
- Restaurant detail / menu
- Cart / checkout
- Customer order history / order detail
- Restaurant dashboard / incoming orders
- Restaurant accept/reject order flow
- Delivery agent dashboard / active deliveries
- Live location tracking page

---

## Frontend implementation notes for AntiGravity

The frontend generator should build pages around these primary actions:

- Register account by role
- Login and store JWT token
- Browse restaurants by lat/lng
- View menu and add to cart
- Checkout and create order
- Poll order history and specific order details
- Restaurant accept/reject order
- Delivery agent accept nearby order assignment via WebSocket
- Update delivery status
- Track live order movements

This is the complete backend contract needed to build the React frontend.
