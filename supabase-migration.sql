-- ============================================================================
-- SUPABASE POSTGRESQL MIGRATION: Food Delivery System
-- ============================================================================
-- Run this entire script in Supabase SQL editor (https://app.supabase.com)
-- This creates all tables, enums, indexes, and foreign keys for the system
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE order_status AS ENUM (
  'pending_payment',           -- Order created, awaiting payment
  'payment_failed',            -- Payment declined
  'placed',                    -- Payment successful, order placed
  'accepted_by_restaurant',    -- Restaurant has accepted the order
  'rejected_by_restaurant',    -- Restaurant rejected the order
  'looking_for_agent',         -- No delivery agent found yet
  'agent_assigned',            -- Delivery agent accepted the order
  'picked_up',                 -- Delivery agent picked up from restaurant
  'on_the_way',                -- Delivery agent en route to customer
  'delivered',                 -- Order delivered to customer
  'cancelled'                  -- Order cancelled by customer or restaurant
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'success',
  'failed'
);

CREATE TYPE user_role AS ENUM (
  'customer',
  'restaurant',
  'delivery_agent'
);

-- ============================================================================
-- 2. CUSTOMERS TABLE
-- ============================================================================

CREATE TABLE customers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone_no VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone_no);

-- ============================================================================
-- 3. RESTAURANTS TABLE
-- ============================================================================

CREATE TABLE restaurants (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone_no VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  cuisine_type VARCHAR(100),
  is_open BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_restaurants_email ON restaurants(email);
CREATE INDEX idx_restaurants_open ON restaurants(is_open);
CREATE INDEX idx_restaurants_coords ON restaurants(lat, lng);

-- ============================================================================
-- 4. MENU ITEMS TABLE
-- ============================================================================

CREATE TABLE menu_items ( 
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  restaurant_id BIGINT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  category VARCHAR(100),
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);

-- ============================================================================
-- 5. DELIVERY AGENTS TABLE
-- ============================================================================

CREATE TABLE delivery_agents (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) NOT NULL,
  phone_no VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  number_plate VARCHAR(50) NOT NULL,
  licence_no VARCHAR(50) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_agents_phone ON delivery_agents(phone_no);
CREATE INDEX idx_delivery_agents_available ON delivery_agents(is_available);
CREATE INDEX idx_delivery_agents_coords ON delivery_agents(lat, lng);

-- ============================================================================
-- 6. CARTS TABLE
-- ============================================================================

CREATE TABLE carts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id BIGINT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_carts_customer ON carts(customer_id);
CREATE INDEX idx_carts_restaurant ON carts(restaurant_id);

-- Constraint: one active cart per customer per restaurant
-- Use a boolean `is_active` column maintained by the update trigger instead of
-- a predicate using NOW() (which is not IMMUTABLE and cannot appear in an
-- index predicate). The trigger below keeps `is_active` true for carts with
-- recent updates (last 1 day).
CREATE UNIQUE INDEX idx_carts_customer_restaurant ON carts(customer_id, restaurant_id)
WHERE is_active = true;

-- ============================================================================
-- 7. CART ITEMS TABLE
-- ============================================================================

CREATE TABLE cart_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  menu_item_id BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_snapshot NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_menu_item ON cart_items(menu_item_id);

-- ============================================================================
-- 8. ORDERS TABLE (Core of the system)
-- ============================================================================

CREATE TABLE orders (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  restaurant_id BIGINT NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  delivery_agent_id BIGINT REFERENCES delivery_agents(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'pending_payment',
  total_amount NUMERIC(10, 2) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_lat DOUBLE PRECISION NOT NULL,
  delivery_lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_agent ON orders(delivery_agent_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ============================================================================
-- 9. ORDER ITEMS TABLE (Snapshot of what was ordered)
-- ============================================================================

CREATE TABLE order_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  item_name_snapshot VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_snapshot NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id);

-- ============================================================================
-- 10. PAYMENTS TABLE
-- ============================================================================

CREATE TABLE payments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  method VARCHAR(50) DEFAULT 'card',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================================
-- 11. DELIVERY TRACKING TABLE (Historical records synced from Redis)
-- ============================================================================

CREATE TABLE delivery_tracking (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delivery_agent_id BIGINT NOT NULL REFERENCES delivery_agents(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_tracking_order ON delivery_tracking(order_id);
CREATE INDEX idx_delivery_tracking_agent ON delivery_tracking(delivery_agent_id);
CREATE INDEX idx_delivery_tracking_time ON delivery_tracking(updated_at DESC);

-- ============================================================================
-- 12. TRIGGERS FOR updated_at AUTO-UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- update the timestamp
  NEW.updated_at = CURRENT_TIMESTAMP;

  -- maintain `is_active` for carts: mark as active if updated within last 1 day
  IF TG_TABLE_NAME = 'carts' THEN
    IF NEW.updated_at > (CURRENT_TIMESTAMP - INTERVAL '1 day') THEN
      NEW.is_active = TRUE;
    ELSE
      NEW.is_active = FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at
BEFORE UPDATE ON restaurants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON menu_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_agents_updated_at
BEFORE UPDATE ON delivery_agents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carts_updated_at
BEFORE UPDATE ON carts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 13. SAMPLE DATA (OPTIONAL - for testing)
-- ============================================================================

-- Insert sample customer
INSERT INTO customers (name, email, password_hash, phone_no, address, lat, lng) VALUES
  ('Alice Johnson', 'alice@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/1Rm', '9876543210', '123 Main St, Delhi', 28.6139, 77.2090);

-- Insert sample restaurant
INSERT INTO restaurants (name, email, password_hash, phone_no, address, lat, lng, cuisine_type, is_open) VALUES
  ('Pizza Palace', 'pizza@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/1Rm', '9999999999', '456 Restaurant Ave, Delhi', 28.6200, 77.2200, 'Italian', true),
  ('Spice House', 'spice@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/1Rm', '8888888888', '789 Curry Lane, Delhi', 28.6150, 77.2150, 'Indian', true);

-- Insert sample menu items
INSERT INTO menu_items (restaurant_id, name, description, price, category, is_available) VALUES
  (1, 'Margherita Pizza', 'Classic tomato and mozzarella', 350.00, 'Pizza', true),
  (1, 'Pepperoni Pizza', 'Pizza with pepperoni slices', 450.00, 'Pizza', true),
  (2, 'Butter Chicken', 'Creamy tomato-based curry', 400.00, 'Curry', true),
  (2, 'Dal Makhani', 'Lentils in butter and cream', 320.00, 'Curry', true);

-- Insert sample delivery agent
INSERT INTO delivery_agents (name, phone_no, password_hash, number_plate, licence_no, lat, lng, is_available) VALUES
  ('Raj Kumar', '9111111111', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/1Rm', 'DL-01-AB-1234', 'DL-LIC-123456', 28.6160, 77.2160, true);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- Note: All passwords above are hashed versions of "password"
-- Change all passwords in production!
