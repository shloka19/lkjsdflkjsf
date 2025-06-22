/*
  # Parking Management System Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `name` (text)
      - `role` (text, enum: customer, staff, admin)
      - `phone` (text, optional)
      - `created_at` (timestamp)
      - `last_login` (timestamp, optional)

    - `parking_spaces`
      - `id` (uuid, primary key)
      - `number` (text, unique)
      - `floor` (integer)
      - `section` (text)
      - `type` (text, enum: regular, compact, disabled, electric)
      - `status` (text, enum: available, occupied, reserved, maintenance)
      - `hourly_rate` (decimal)
      - `position` (jsonb)
      - `created_at` (timestamp)

    - `bookings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `space_id` (uuid, foreign key)
      - `start_time` (timestamp)
      - `end_time` (timestamp)
      - `total_amount` (decimal)
      - `status` (text, enum: pending, confirmed, active, completed, cancelled)
      - `payment_status` (text, enum: pending, paid, failed, refunded)
      - `vehicle_number` (text, optional)
      - `qr_code` (text, optional)
      - `created_at` (timestamp)
      - `cancelled_at` (timestamp, optional)

    - `payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `booking_id` (uuid, foreign key)
      - `amount` (decimal)
      - `method` (text, enum: card, paypal, wallet, cash)
      - `status` (text, enum: pending, completed, failed, refunded)
      - `transaction_id` (text, optional)
      - `created_at` (timestamp)
      - `refunded_at` (timestamp, optional)

    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `type` (text, enum: booking, payment, reminder, system)
      - `title` (text)
      - `message` (text)
      - `read` (boolean, default false)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access control
    - Add policies for admin access

  3. Indexes
    - Add indexes for frequently queried columns
    - Add composite indexes for complex queries
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');
CREATE TYPE space_type AS ENUM ('regular', 'compact', 'disabled', 'electric');
CREATE TYPE space_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('card', 'paypal', 'wallet', 'cash');
CREATE TYPE notification_type AS ENUM ('booking', 'payment', 'reminder', 'system');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  role user_role DEFAULT 'customer',
  phone text,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Parking spaces table
CREATE TABLE IF NOT EXISTS parking_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  floor integer NOT NULL CHECK (floor > 0),
  section text NOT NULL,
  type space_type NOT NULL,
  status space_status DEFAULT 'available',
  hourly_rate decimal(10,2) NOT NULL CHECK (hourly_rate > 0),
  position jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES parking_spaces(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL CHECK (end_time > start_time),
  total_amount decimal(10,2) NOT NULL CHECK (total_amount > 0),
  status booking_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  vehicle_number text,
  qr_code text,
  created_at timestamptz DEFAULT now(),
  cancelled_at timestamptz
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  transaction_id text,
  created_at timestamptz DEFAULT now(),
  refunded_at timestamptz
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid()::uuid);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::uuid);

CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update user roles"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Parking spaces policies (public read, admin write)
CREATE POLICY "Anyone can read parking spaces"
  ON parking_spaces
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage parking spaces"
  ON parking_spaces
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Bookings policies
CREATE POLICY "Users can read own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can create bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "Users can update own bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Staff can read all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::uuid AND role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Staff can update bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::uuid AND role IN ('staff', 'admin')
    )
  );

-- Payments policies
CREATE POLICY "Users can read own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can create payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "Staff can read all payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::uuid AND role IN ('staff', 'admin')
    )
  );

CREATE POLICY "Admins can update payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::uuid AND role = 'admin'
    )
  );

-- Notifications policies
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_parking_spaces_status ON parking_spaces(status);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_type ON parking_spaces(type);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_floor_section ON parking_spaces(floor, section);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_space_id ON bookings(space_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_end_time ON bookings(end_time);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Insert sample data
INSERT INTO parking_spaces (number, floor, section, type, status, hourly_rate, position) VALUES
-- Floor 1, Section A
('A1-01', 1, 'A', 'disabled', 'available', 5.00, '{"x": 20, "y": 50}'),
('A1-02', 1, 'A', 'disabled', 'available', 5.00, '{"x": 100, "y": 50}'),
('A1-03', 1, 'A', 'compact', 'available', 8.00, '{"x": 180, "y": 50}'),
('A1-04', 1, 'A', 'compact', 'occupied', 8.00, '{"x": 260, "y": 50}'),
('A1-05', 1, 'A', 'compact', 'available', 8.00, '{"x": 340, "y": 50}'),
('A1-06', 1, 'A', 'compact', 'available', 8.00, '{"x': 420, "y": 50}'),
('A1-07', 1, 'A', 'electric', 'available', 12.00, '{"x": 500, "y": 50}'),
('A1-08', 1, 'A', 'electric', 'reserved', 12.00, '{"x": 580, "y": 50}'),
('A1-09', 1, 'A', 'regular', 'available', 10.00, '{"x": 660, "y": 50}'),
('A1-10', 1, 'A', 'regular', 'available', 10.00, '{"x": 740, "y": 50}'),
-- Floor 1, Section B
('B1-01', 1, 'B', 'regular', 'available', 10.00, '{"x": 20, "y": 200}'),
('B1-02', 1, 'B', 'regular', 'occupied', 10.00, '{"x": 100, "y": 200}'),
('B1-03', 1, 'B', 'regular', 'available', 10.00, '{"x": 180, "y": 200}'),
('B1-04', 1, 'B', 'regular', 'available', 10.00, '{"x": 260, "y": 200}'),
('B1-05', 1, 'B', 'compact', 'available', 8.00, '{"x": 340, "y": 200}'),
('B1-06', 1, 'B', 'compact', 'available', 8.00, '{"x": 420, "y": 200}'),
('B1-07', 1, 'B', 'electric', 'available', 12.00, '{"x": 500, "y": 200}'),
('B1-08', 1, 'B', 'electric', 'available', 12.00, '{"x": 580, "y": 200}'),
('B1-09', 1, 'B', 'regular', 'maintenance', 10.00, '{"x": 660, "y": 200}'),
('B1-10', 1, 'B', 'regular', 'available', 10.00, '{"x": 740, "y": 200}'),
-- Floor 2, Section A
('A2-01', 2, 'A', 'disabled', 'available', 5.00, '{"x": 20, "y": 50}'),
('A2-02', 2, 'A', 'disabled', 'available', 5.00, '{"x": 100, "y": 50}'),
('A2-03', 2, 'A', 'compact', 'available', 8.00, '{"x": 180, "y": 50}'),
('A2-04', 2, 'A', 'compact', 'available', 8.00, '{"x": 260, "y": 50}'),
('A2-05', 2, 'A', 'electric', 'available', 12.00, '{"x": 340, "y": 50}'),
('A2-06', 2, 'A', 'electric', 'available', 12.00, '{"x": 420, "y": 50}'),
('A2-07', 2, 'A', 'regular', 'available', 10.00, '{"x": 500, "y": 50}'),
('A2-08', 2, 'A', 'regular', 'available', 10.00, '{"x": 580, "y": 50}'),
('A2-09', 2, 'A', 'regular', 'available', 10.00, '{"x": 660, "y": 50}'),
('A2-10', 2, 'A', 'regular', 'available', 10.00, '{"x": 740, "y": 50}');