# Delivery Agent Live Location Tracking

The system tracks the delivery agent's GPS location and sends it to the customer in real time using WebSockets.

## How It Works

```text
Delivery Agent
      ↓
  GPS Location
      ↓
  POST /update
      ↓
Location Service
      ↓
   Redis
      ↓
 WebSocket
      ↓
 Customer Browser
      ↓
   Map Marker
```

### 1. Delivery Agent Gets Location

The delivery agent's browser gets GPS coordinates using:

```javascript
navigator.geolocation.watchPosition()
```

Example:

```text
Latitude: 16.5062
Longitude: 80.6480
```

### 2. Agent Sends Location

The agent sends the coordinates to:

```text
POST /update
```

Example request:

```json
{
  "agent_id": "AGENT123",
  "order_id": "ORDER123",
  "lat": 16.5062,
  "lng": 80.6480
}
```

### 3. Location is Stored in Redis

The latest location is stored temporarily:

```text
agent:location:AGENT123
        ↓
16.5062,80.6480
```

Redis is used because location updates happen frequently and need to be fast.

### 4. Customer Connects Using WebSocket

The customer connects to:

```text
ws://localhost:3017/orders/ORDER123
```

The server stores this WebSocket connection against `ORDER123`.

### 5. Server Sends Location to Customer

When a new location arrives, the server finds all customers connected to that order and sends:

```json
{
  "event": "live_location",
  "agentId": "AGENT123",
  "lat": 16.5062,
  "lng": 80.6480
}
```

using:

```javascript
ws.send(JSON.stringify(update))
```

### 6. Customer Updates the Map

The customer's browser receives the WebSocket message and moves the delivery agent's marker on the map.

## In Simple Words

**GPS → Agent → Backend → Redis → WebSocket → Customer → Map**

The agent continuously sends their current location. The backend stores the latest location in Redis and immediately pushes the new coordinates to the customer through WebSocket. The customer's map then moves the agent's marker.
