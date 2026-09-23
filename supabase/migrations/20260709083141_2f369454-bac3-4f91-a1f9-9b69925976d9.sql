
-- 1. Fix get_current_tenant_id: no longer coalesce to user id
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Prevent authenticated users from nulling their tenant_id via profile update
CREATE OR REPLACE FUNCTION public.prevent_profile_tenant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.tenant_id := OLD.tenant_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_prevent_tenant_change ON public.profiles;
CREATE TRIGGER profiles_prevent_tenant_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_tenant_change();

-- 2. Revoke EXECUTE on SECURITY DEFINER helpers from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_current_tenant_id() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.next_doc_number(uuid, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- Keep client-callable RPCs restricted to authenticated only (no anon)
REVOKE EXECUTE ON FUNCTION public.create_order_and_update_stock(uuid, numeric, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_top_selling_products(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.expire_stale_commands() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.create_order_and_update_stock(uuid, numeric, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_selling_products(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_commands() TO authenticated;

-- 3. Hide products.cost_price from anonymous users (column-level privilege)
REVOKE SELECT (cost_price) ON public.products FROM anon;

-- 4. Harden user_roles: explicit restrictive policy so users cannot self-grant roles
DROP POLICY IF EXISTS "Users cannot modify their own roles" ON public.user_roles;
CREATE POLICY "Users cannot modify their own roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
