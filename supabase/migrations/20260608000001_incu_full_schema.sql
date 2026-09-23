-- =============================================================================
-- INCU PLATFORM — Full Schema Migration
-- Day 1 of 5: Database Foundation
-- =============================================================================

-- STEP 1: Extend existing app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'dealer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'farmer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- STEP 2: Extend profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_organization_root BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS slug VARCHAR(128),
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS logo_url VARCHAR(512),
  ADD COLUMN IF NOT EXISTS organization_status TEXT CHECK (organization_status IN ('pending','active','suspended')),
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(512);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_org_root ON public.profiles(is_organization_root);

-- STEP 3: Extend user_roles for tenant scoping
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant ON public.user_roles(tenant_id);

-- STEP 4: Tenant settings
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
  currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  pos_defaults JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- STEP 5: Auth tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.qr_login_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qlt_token ON public.qr_login_tokens(token);
ALTER TABLE public.qr_login_tokens ENABLE ROW LEVEL SECURITY;

-- STEP 6: Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(32),
  address TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- STEP 7: Dealers
CREATE TABLE IF NOT EXISTS public.dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  email VARCHAR(255),
  commission_rate NUMERIC(5,2) DEFAULT 0,
  commission_type TEXT NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent','fixed')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_dealers_tenant ON public.dealers(tenant_id);
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;

-- STEP 8: Farmers
CREATE TABLE IF NOT EXISTS public.farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  email VARCHAR(255),
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_farmers_tenant ON public.farmers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_farmers_dealer ON public.farmers(dealer_id);
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

-- STEP 9: Team members
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_label VARCHAR(128),
  department VARCHAR(128),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_tenant ON public.team_members(tenant_id);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- STEP 10: Product Categories & Units
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pcat_tenant ON public.product_categories(tenant_id);
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(64) NOT NULL,
  abbreviation VARCHAR(16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_units_tenant ON public.units(tenant_id);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- STEP 11: Extend products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sku VARCHAR(128),
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);

-- Product variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(128),
  price_modifier NUMERIC(12,2) DEFAULT 0,
  variant_metadata JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pvar_product ON public.product_variants(product_id);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Product stock
CREATE TABLE IF NOT EXISTS public.product_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, tenant_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_pstock_tenant ON public.product_stock(tenant_id);
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

-- Stock movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','adjust','return','wastage')),
  quantity INTEGER NOT NULL,
  unit_cost_at_time NUMERIC(12,2),
  reference_type TEXT,
  reference_id UUID,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_smov_tenant ON public.stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_smov_product ON public.stock_movements(product_id);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- STEP 12: Offers
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_order_amount NUMERIC(12,2) DEFAULT 0,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offers_tenant ON public.offers(tenant_id);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- STEP 13: Invoices
CREATE TYPE IF NOT EXISTS public.invoice_status AS ENUM ('draft','completed','cancelled');
CREATE TYPE IF NOT EXISTS public.payment_method_type AS ENUM ('cash','card','mobile_banking','bank_transfer','credit','other');

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_number VARCHAR(64) NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_amount NUMERIC(14,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS idx_inv_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_inv_created ON public.invoices(created_at);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invitem_invoice ON public.invoice_items(invoice_id);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  method public.payment_method_type NOT NULL DEFAULT 'cash',
  reference TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invpay_invoice ON public.invoice_payments(invoice_id);
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- STEP 14: Subscriptions & SSLCommerz
CREATE TYPE IF NOT EXISTS public.subscription_status AS ENUM ('pending','active','expired','suspended','cancelled');

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name VARCHAR(128) NOT NULL DEFAULT 'basic',
  status public.subscription_status NOT NULL DEFAULT 'pending',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tsub_tenant ON public.tenant_subscriptions(tenant_id);
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL DEFAULT 'sslcommerz',
  gateway_tran_id TEXT UNIQUE,
  val_id TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'BDT',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','cancelled','refunded')),
  bank_tran_id TEXT,
  card_type TEXT,
  store_amount NUMERIC(12,2),
  ipn_received_at TIMESTAMPTZ,
  cancel_reason TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_tran ON public.payments(gateway_tran_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- STEP 15: Returns & Wastage
CREATE TABLE IF NOT EXISTS public.sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  return_number VARCHAR(64),
  reason TEXT,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sret_tenant ON public.sales_returns(tenant_id);
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sales_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  invoice_item_id UUID REFERENCES public.invoice_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  line_total NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.wastage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_cost NUMERIC(12,2),
  reason TEXT,
  wastage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wastage_tenant ON public.wastage_records(tenant_id);
ALTER TABLE public.wastage_records ENABLE ROW LEVEL SECURITY;

-- STEP 16: Expenses
CREATE TABLE IF NOT EXISTS public.expense_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64),
  allocation_percent NUMERIC(5,2) DEFAULT 0,
  linked_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.expense_sectors(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_esec_tenant ON public.expense_sectors(tenant_id);
ALTER TABLE public.expense_sectors ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES public.expense_sectors(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exp_tenant ON public.expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_exp_date ON public.expenses(expense_date);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- STEP 17: Devices
CREATE TABLE IF NOT EXISTS public.device_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.device_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_type_id UUID REFERENCES public.device_types(id) ON DELETE SET NULL,
  serial_number VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255),
  firmware_version VARCHAR(64),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','active','online','offline','maintenance','retired')),
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen TIMESTAMPTZ,
  metadata JSONB,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_devices_tenant ON public.devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial ON public.devices(serial_number);
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.device_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL,
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_dassign_device ON public.device_assignments(device_id);
CREATE INDEX IF NOT EXISTS idx_dassign_farmer ON public.device_assignments(farmer_id);
ALTER TABLE public.device_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.device_telemetry_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  temperature NUMERIC(6,2),
  humidity NUMERIC(6,2),
  co2_level NUMERIC(8,2),
  status_payload JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telemetry_device ON public.device_telemetry_snapshots(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded ON public.device_telemetry_snapshots(recorded_at);
ALTER TABLE public.device_telemetry_snapshots ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.device_issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_direp_device ON public.device_issue_reports(device_id);
ALTER TABLE public.device_issue_reports ENABLE ROW LEVEL SECURITY;

-- STEP 18: Commands
CREATE TYPE IF NOT EXISTS public.command_status AS ENUM ('queued','sent','success','failed','expired','cancelled');

CREATE TABLE IF NOT EXISTS public.device_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES auth.users(id),
  command_type VARCHAR(128) NOT NULL,
  payload JSONB,
  status public.command_status NOT NULL DEFAULT 'queued',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dcmd_device ON public.device_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_dcmd_status ON public.device_commands(status);
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.device_command_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID NOT NULL REFERENCES public.device_commands(id) ON DELETE CASCADE,
  status public.command_status NOT NULL,
  message TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.device_command_logs ENABLE ROW LEVEL SECURITY;

-- STEP 19: Extra features
CREATE TABLE IF NOT EXISTS public.contact_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  label VARCHAR(128) NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','phone','email','url','address')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','admin','dealer','customer','farmer','team')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','team','customer','dealer','farmer')),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- STEP 20: Report export jobs
CREATE TABLE IF NOT EXISTS public.report_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_type VARCHAR(64) NOT NULL,
  filters JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  file_url TEXT,
  delivery_email TEXT,
  delivered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.report_export_jobs ENABLE ROW LEVEL SECURITY;

-- STEP 21: RLS helper functions
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role IN ('admin','super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.belongs_to_tenant(p_tenant_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND tenant_id = p_tenant_id
  ) OR auth.uid()::text = p_tenant_id::text
$$;

-- STEP 22: RLS Policies
CREATE POLICY "tenant_settings_select" ON public.tenant_settings FOR SELECT USING (belongs_to_tenant(tenant_id));
CREATE POLICY "tenant_settings_modify" ON public.tenant_settings FOR ALL USING (is_tenant_admin(tenant_id));

CREATE POLICY "customers_select" ON public.customers FOR SELECT USING (belongs_to_tenant(tenant_id));
CREATE POLICY "customers_modify" ON public.customers FOR ALL USING (is_tenant_admin(tenant_id));

CREATE POLICY "dealers_select" ON public.dealers FOR SELECT USING (belongs_to_tenant(tenant_id));
CREATE POLICY "dealers_modify" ON public.dealers FOR ALL USING (is_tenant_admin(tenant_id));

CREATE POLICY "farmers_select" ON public.farmers FOR SELECT USING (belongs_to_tenant(tenant_id));
CREATE POLICY "farmers_modify" ON public.farmers FOR ALL USING (is_tenant_admin(tenant_id));

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (belongs_to_tenant(tenant_id));
CREATE POLICY "invoices_modify" ON public.invoices FOR ALL USING (belongs_to_tenant(tenant_id));

CREATE POLICY "invoice_items_select" ON public.invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND belongs_to_tenant(i.tenant_id))
);
CREATE POLICY "invoice_items_modify" ON public.invoice_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND belongs_to_tenant(i.tenant_id))
);

CREATE POLICY "devices_select" ON public.devices FOR SELECT USING (belongs_to_tenant(tenant_id));
CREATE POLICY "devices_modify" ON public.devices FOR ALL USING (is_tenant_admin(tenant_id));

CREATE POLICY "commands_select" ON public.device_commands FOR SELECT USING (belongs_to_tenant(tenant_id));
CREATE POLICY "commands_insert" ON public.device_commands FOR INSERT WITH CHECK (belongs_to_tenant(tenant_id));

CREATE POLICY "expenses_select" ON public.expenses FOR SELECT USING (belongs_to_tenant(tenant_id));
CREATE POLICY "expenses_modify" ON public.expenses FOR ALL USING (belongs_to_tenant(tenant_id));

CREATE POLICY "faqs_public_read" ON public.faqs FOR SELECT USING (is_active = TRUE);
CREATE POLICY "faqs_admin_write" ON public.faqs FOR ALL USING (tenant_id IS NULL OR is_tenant_admin(tenant_id));

CREATE POLICY "notices_read" ON public.notices FOR SELECT USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "notices_admin_write" ON public.notices FOR ALL USING (tenant_id IS NULL OR is_tenant_admin(tenant_id));

CREATE POLICY "contact_read" ON public.contact_info FOR SELECT USING (is_active = TRUE);
CREATE POLICY "contact_admin_write" ON public.contact_info FOR ALL USING (tenant_id IS NULL OR is_tenant_admin(tenant_id));

CREATE POLICY "pcat_select" ON public.product_categories FOR SELECT USING (belongs_to_tenant(tenant_id));
CREATE POLICY "pcat_modify" ON public.product_categories FOR ALL USING (is_tenant_admin(tenant_id));

CREATE POLICY "units_select" ON public.units FOR SELECT USING (belongs_to_tenant(tenant_id));
CREATE POLICY "units_modify" ON public.units FOR ALL USING (is_tenant_admin(tenant_id));

-- STEP 23: Triggers & DB functions
CREATE OR REPLACE FUNCTION public.update_device_last_seen()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.devices SET is_online = TRUE, last_seen = NEW.recorded_at,
    status = 'online', updated_at = now() WHERE id = NEW.device_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_device_last_seen ON public.device_telemetry_snapshots;
CREATE TRIGGER trg_device_last_seen
  AFTER INSERT ON public.device_telemetry_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_device_last_seen();

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_tenant_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM public.invoices WHERE tenant_id = p_tenant_id;
  RETURN 'INV-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_stock_on_invoice_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'draft' THEN
    INSERT INTO public.stock_movements (product_id, variant_id, tenant_id, movement_type, quantity, reference_type, reference_id, created_by)
    SELECT ii.product_id, ii.variant_id, NEW.tenant_id, 'out', -1 * ii.quantity::INTEGER, 'invoice', NEW.id, NEW.created_by
    FROM public.invoice_items ii WHERE ii.invoice_id = NEW.id AND ii.product_id IS NOT NULL;

    UPDATE public.product_stock ps
    SET quantity = ps.quantity - ii.quantity::INTEGER, updated_at = now()
    FROM public.invoice_items ii
    WHERE ii.invoice_id = NEW.id AND ps.product_id = ii.product_id AND ps.tenant_id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deduct_stock ON public.invoices;
CREATE TRIGGER trg_deduct_stock
  AFTER UPDATE ON public.invoices FOR EACH ROW
  EXECUTE FUNCTION public.deduct_stock_on_invoice_complete();
