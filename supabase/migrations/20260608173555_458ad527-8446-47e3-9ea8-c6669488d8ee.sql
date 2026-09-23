
-- =========================================================
-- Profiles: tenant scoping
-- =========================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid;
UPDATE public.profiles SET tenant_id = id WHERE tenant_id IS NULL;

-- Backfill default for future inserts via trigger
CREATE OR REPLACE FUNCTION public.set_profile_tenant_default()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := NEW.id; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_tenant_default ON public.profiles;
CREATE TRIGGER trg_profiles_tenant_default
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_tenant_default();

-- =========================================================
-- Helper: current user's tenant
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(tenant_id, id) FROM public.profiles WHERE id = auth.uid()
$$;

-- =========================================================
-- Products: cost_price
-- =========================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- =========================================================
-- updated_at trigger (re-use existing public.set_updated_at)
-- =========================================================

-- =========================================================
-- CUSTOMERS
-- =========================================================
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.customers FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- DEALERS
-- =========================================================
CREATE TABLE public.dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_type text NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent','fixed')),
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dealers TO authenticated;
GRANT ALL ON public.dealers TO service_role;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.dealers FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_dealers_updated BEFORE UPDATE ON public.dealers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- FARMERS
-- =========================================================
CREATE TABLE public.farmers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  dealer_id uuid REFERENCES public.dealers(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farmers TO authenticated;
GRANT ALL ON public.farmers TO service_role;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.farmers FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_farmers_updated BEFORE UPDATE ON public.farmers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- TEAM MEMBERS
-- =========================================================
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_label text,
  department text,
  joined_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.team_members FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_team_updated BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- EXPENSE SECTORS
-- =========================================================
CREATE TABLE public.expense_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  parent_id uuid REFERENCES public.expense_sectors(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  allocation_percent numeric NOT NULL DEFAULT 0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_sectors TO authenticated;
GRANT ALL ON public.expense_sectors TO service_role;
ALTER TABLE public.expense_sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.expense_sectors FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_sectors_updated BEFORE UPDATE ON public.expense_sectors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- EXPENSES
-- =========================================================
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  sector_id uuid REFERENCES public.expense_sectors(id) ON DELETE SET NULL,
  title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  receipt_url text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.expenses FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- INVOICES
-- =========================================================
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, invoice_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.invoices FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.invoice_items FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.invoices i WHERE i.id = invoice_id
    AND (i.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS(SELECT 1 FROM public.invoices i WHERE i.id = invoice_id
    AND (i.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))));

-- =========================================================
-- SALES RETURNS
-- =========================================================
CREATE TABLE public.sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  return_number text NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  reason text,
  total_amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, return_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_returns TO authenticated;
GRANT ALL ON public.sales_returns TO service_role;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.sales_returns FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_returns_updated BEFORE UPDATE ON public.sales_returns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sales_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text,
  quantity numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_return_items TO authenticated;
GRANT ALL ON public.sales_return_items TO service_role;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.sales_return_items FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.sales_returns r WHERE r.id = return_id
    AND (r.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS(SELECT 1 FROM public.sales_returns r WHERE r.id = return_id
    AND (r.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))));

-- =========================================================
-- WASTAGE
-- =========================================================
CREATE TABLE public.wastage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  reason text,
  wastage_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wastage_records TO authenticated;
GRANT ALL ON public.wastage_records TO service_role;
ALTER TABLE public.wastage_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.wastage_records FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_wastage_updated BEFORE UPDATE ON public.wastage_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- STOCK MOVEMENTS
-- =========================================================
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  movement_type text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  reference_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.stock_movements FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));

-- =========================================================
-- DEVICES
-- =========================================================
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  serial_number text NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  last_seen timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, serial_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.devices FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_devices_updated BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.device_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_assignments TO authenticated;
GRANT ALL ON public.device_assignments TO service_role;
ALTER TABLE public.device_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rw" ON public.device_assignments FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.devices d WHERE d.id = device_id
    AND (d.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS(SELECT 1 FROM public.devices d WHERE d.id = device_id
    AND (d.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))));

-- =========================================================
-- Helper: next sequential number per tenant
-- =========================================================
CREATE OR REPLACE FUNCTION public.next_doc_number(p_tenant uuid, p_prefix text, p_table text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF p_table = 'invoices' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(invoice_number, '\D','','g'),'')::int),0)+1 INTO n
    FROM public.invoices WHERE tenant_id = p_tenant;
  ELSIF p_table = 'sales_returns' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(return_number, '\D','','g'),'')::int),0)+1 INTO n
    FROM public.sales_returns WHERE tenant_id = p_tenant;
  ELSE n := 1; END IF;
  RETURN p_prefix || lpad(n::text, 5, '0');
END $$;
