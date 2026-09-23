
-- Extend devices
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS device_type_id UUID,
  ADD COLUMN IF NOT EXISTS firmware_version TEXT,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Extend device_assignments
ALTER TABLE public.device_assignments
  ADD COLUMN IF NOT EXISTS dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- device_types
CREATE TABLE IF NOT EXISTS public.device_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_types TO authenticated;
GRANT ALL ON public.device_types TO service_role;
ALTER TABLE public.device_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_types_read" ON public.device_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "device_types_admin_write" ON public.device_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_device_types_updated BEFORE UPDATE ON public.device_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.devices
  ADD CONSTRAINT devices_device_type_fk FOREIGN KEY (device_type_id) REFERENCES public.device_types(id) ON DELETE SET NULL;

-- telemetry
CREATE TABLE IF NOT EXISTS public.device_telemetry_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  temperature NUMERIC,
  humidity NUMERIC,
  co2_level NUMERIC,
  status_payload JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON public.device_telemetry_snapshots(device_id, recorded_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_telemetry_snapshots TO authenticated;
GRANT ALL ON public.device_telemetry_snapshots TO service_role;
ALTER TABLE public.device_telemetry_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telemetry_tenant_rw" ON public.device_telemetry_snapshots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.devices d WHERE d.id = device_id AND (d.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.devices d WHERE d.id = device_id AND (d.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))));

-- issue reports
CREATE TABLE IF NOT EXISTS public.device_issue_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_issue_reports TO authenticated;
GRANT ALL ON public.device_issue_reports TO service_role;
ALTER TABLE public.device_issue_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issues_tenant_rw" ON public.device_issue_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.devices d WHERE d.id = device_id AND (d.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.devices d WHERE d.id = device_id AND (d.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))));
CREATE TRIGGER trg_issues_updated BEFORE UPDATE ON public.device_issue_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- commands
CREATE TABLE IF NOT EXISTS public.device_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  command_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','success','failed','expired','cancelled')),
  expires_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commands_tenant_time ON public.device_commands(tenant_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_commands TO authenticated;
GRANT ALL ON public.device_commands TO service_role;
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commands_tenant_rw" ON public.device_commands FOR ALL TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_commands_updated BEFORE UPDATE ON public.device_commands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- command logs
CREATE TABLE IF NOT EXISTS public.device_command_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID NOT NULL REFERENCES public.device_commands(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cmd_logs_cmd ON public.device_command_logs(command_id, logged_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_command_logs TO authenticated;
GRANT ALL ON public.device_command_logs TO service_role;
ALTER TABLE public.device_command_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cmd_logs_tenant_rw" ON public.device_command_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.device_commands c WHERE c.id = command_id AND (c.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.device_commands c WHERE c.id = command_id AND (c.tenant_id = public.get_current_tenant_id() OR public.has_role(auth.uid(),'admin'))));

-- RPC: expire stale commands
CREATE OR REPLACE FUNCTION public.expire_stale_commands()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
  t UUID := public.get_current_tenant_id();
BEGIN
  UPDATE public.device_commands
     SET status = 'expired', updated_at = now()
   WHERE status IN ('queued','sent')
     AND expires_at IS NOT NULL
     AND expires_at < now()
     AND (tenant_id = t OR public.has_role(auth.uid(),'admin'));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
