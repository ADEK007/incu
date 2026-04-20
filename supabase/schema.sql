-- ================================ 
-- 0. EXTENSIONS 
-- ================================ 
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; 

-- ================================ 
-- 1. TABLES 
-- ================================ 

-- USERS 
CREATE TABLE IF NOT EXISTS users ( 
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE, 
  full_name TEXT, 
  email TEXT UNIQUE, 
  phone TEXT, 
  country TEXT DEFAULT 'Bangladesh', 
  role TEXT DEFAULT 'user' 
    CHECK (role IN ('user', 'admin', 'manager', 'developer', 'writer')), 
  created_at TIMESTAMPTZ DEFAULT NOW() 
); 

-- PRODUCTS 
CREATE TABLE IF NOT EXISTS products ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  name TEXT NOT NULL, 
  description TEXT, 
  specifications JSONB DEFAULT '{}', 
  price NUMERIC(10,2) NOT NULL, 
  image_url TEXT, 
  images TEXT[] DEFAULT '{}', 
  category TEXT, 
  stock INTEGER DEFAULT 0 CHECK (stock >= 0), 
  created_at TIMESTAMPTZ DEFAULT NOW() 
); 

-- REVIEWS 
CREATE TABLE IF NOT EXISTS reviews ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  product_id UUID REFERENCES products(id) ON DELETE CASCADE, 
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, 
  rating INTEGER CHECK (rating BETWEEN 1 AND 5), 
  comment TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW(), 
  UNIQUE(product_id, user_id) -- one review per user per product 
); 

-- ORDERS 
CREATE TABLE IF NOT EXISTS orders ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, 
  total_amount NUMERIC(10,2) NOT NULL, 
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')), 
  shipping_address TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW() 
); 

-- ORDER ITEMS 
CREATE TABLE IF NOT EXISTS order_items ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE, 
  product_id UUID REFERENCES products(id), 
  quantity INTEGER NOT NULL CHECK (quantity > 0), 
  price_at_time NUMERIC(10,2) NOT NULL 
); 

-- ================================ 
-- 2. INDEXES (PERFORMANCE BOOST) 
-- ================================ 
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category); 
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id); 
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id); 
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id); 

-- ================================ 
-- 3. ENABLE RLS 
-- ================================ 
ALTER TABLE users ENABLE ROW LEVEL SECURITY; 
ALTER TABLE products ENABLE ROW LEVEL SECURITY; 
ALTER TABLE orders ENABLE ROW LEVEL SECURITY; 
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY; 
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY; 

-- ================================ 
-- 4. SECURITY FUNCTION 
-- ================================ 
CREATE OR REPLACE FUNCTION check_is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$ 
BEGIN 
  RETURN EXISTS ( 
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin' 
  ); 
END; 
$$; 

-- ================================ 
-- 5. POLICIES 
-- ================================ 

-- USERS 
CREATE POLICY "Users read own profile" 
ON users FOR SELECT 
USING (auth.uid() = id); 

CREATE POLICY "Users update own profile" 
ON users FOR UPDATE 
USING (auth.uid() = id); 

CREATE POLICY "Admins full access users" 
ON users FOR ALL 
USING (check_is_admin()) 
WITH CHECK (check_is_admin()); 

-- PRODUCTS 
CREATE POLICY "Public read products" 
ON products FOR SELECT 
USING (true); 

CREATE POLICY "Admins full control products" 
ON products FOR ALL 
USING (check_is_admin()) 
WITH CHECK (check_is_admin()); 

-- REVIEWS 
CREATE POLICY "Public read reviews" 
ON reviews FOR SELECT 
USING (true); 

CREATE POLICY "Users insert reviews" 
ON reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id); 

CREATE POLICY "Users delete own reviews" 
ON reviews FOR DELETE 
USING (auth.uid() = user_id); 

-- ORDERS 
CREATE POLICY "Users read own orders" 
ON orders FOR SELECT 
USING (auth.uid() = user_id); 

CREATE POLICY "Users create orders" 
ON orders FOR INSERT 
WITH CHECK (auth.uid() = user_id); 

CREATE POLICY "Admins full control orders" 
ON orders FOR ALL 
USING (check_is_admin()) 
WITH CHECK (check_is_admin()); 

-- ORDER ITEMS 
CREATE POLICY "Users read own order items" 
ON order_items FOR SELECT 
USING ( 
  EXISTS ( 
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid() 
  ) 
); 

CREATE POLICY "Admins full control order items" 
ON order_items FOR ALL 
USING (check_is_admin()) 
WITH CHECK (check_is_admin()); 

-- ================================ 
-- 6. TRIGGER: AUTO CREATE USER 
-- ================================ 
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$ 
BEGIN 
  INSERT INTO public.users (id, full_name, email, phone, country) 
  VALUES ( 
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 
             NEW.raw_user_meta_data->>'name', 
             NEW.email), 
    NEW.email, 
    NEW.raw_user_meta_data->>'phone', 
    COALESCE(NEW.raw_user_meta_data->>'country', 'Bangladesh') 
  ); 
  RETURN NEW; 
END; 
$$; 

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; 

CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users 
FOR EACH ROW 
EXECUTE FUNCTION handle_new_user(); 

-- ================================ 
-- 7. HELPER FUNCTION 
-- ================================ 
CREATE OR REPLACE FUNCTION get_top_selling_products(limit_count INT DEFAULT 5) 
RETURNS TABLE ( 
  product_id UUID, 
  name TEXT, 
  total_quantity BIGINT, 
  total_revenue NUMERIC 
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$ 
BEGIN 
  RETURN QUERY 
  SELECT 
    p.id, 
    p.name, 
    SUM(oi.quantity), 
    SUM(oi.quantity * oi.price_at_time) 
  FROM products p 
  JOIN order_items oi ON p.id = oi.product_id 
  GROUP BY p.id, p.name 
  ORDER BY SUM(oi.quantity) DESC 
  LIMIT limit_count; 
END; 
$$; 
