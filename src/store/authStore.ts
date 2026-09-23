import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'super_admin' | 'admin' | 'dealer' | 'farmer' | 'customer' | 'manager' | 'developer' | 'writer' | 'user';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  profile_picture_url: string | null;
  is_organization_root: boolean;
  business_name: string | null;
  slug: string | null;
  logo_url: string | null;
  organization_status: 'pending' | 'active' | 'suspended' | null;
  role: AppRole;
  tenant_id: string | null;
  created_at: string;
}

export interface ClerkUserLike {
  id?: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: { emailAddress?: string } | null;
  emailAddresses?: Array<{ emailAddress?: string }>;
  imageUrl?: string | null;
  publicMetadata?: Record<string, any>;
}

export const KNOWN_ADMIN_EMAILS: string[] = [
  'mdhhmobin@gmail.com',
];

interface AuthState {
  user: (User & { [key: string]: any }) | null;
  profile: Profile | null;
  loading: boolean;
  setUser: (user: any | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: (userId: string) => Promise<void>;
  syncClerkUser: (clerkUser: ClerkUserLike) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isDealer: () => boolean;
  isFarmer: () => boolean;
  isCustomer: () => boolean;
  tenantId: () => string | null;
}

const ROLE_PRIORITY: AppRole[] = ['super_admin','admin','manager','developer','dealer','farmer','customer','writer','user'];

const pickHighestPriorityRole = (rows: Array<{ role: AppRole }> | null | undefined): AppRole => {
  if (!rows?.length) return 'user';

  for (const role of ROLE_PRIORITY) {
    const match = rows.find((row) => row.role === role);
    if (match) return match.role;
  }

  return 'user';
};

export const getProfileRoleAndTenant = async (userId: string): Promise<{ role: AppRole; tenant_id: string | null }> => {
  const [rolesRes, profileRes] = await Promise.all([
    (supabase.from('user_roles') as any).select('role').eq('user_id', userId),
    supabase.from('profiles').select('tenant_id').eq('id', userId).maybeSingle(),
  ]);

  const role = pickHighestPriorityRole((rolesRes.data as Array<{ role: AppRole }> | null | undefined) ?? []);
  const tenant_id = (profileRes.data as { tenant_id?: string | null } | null)?.tenant_id ?? userId;

  return { role, tenant_id };
};

export const getProfileRole = async (userId: string): Promise<AppRole> => {
  const { role } = await getProfileRoleAndTenant(userId);
  return role;
};

/**
 * Resolves user role in three tiers:
 * 1. Clerk Metadata (publicMetadata.role)
 * 2. Known Admin Email List (KNOWN_ADMIN_EMAILS)
 * 3. Database lookup (profiles / user_roles)
 */
export const resolveUserRole = async (
  clerkUser?: ClerkUserLike | null,
  userId?: string
): Promise<AppRole> => {
  // 1. Check Clerk publicMetadata
  if (clerkUser?.publicMetadata?.role) {
    const metaRole = clerkUser.publicMetadata.role as AppRole;
    if (ROLE_PRIORITY.includes(metaRole)) return metaRole;
  }

  // 2. Check Known Admin Email List
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress;

  if (email && KNOWN_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === email.toLowerCase())) {
    return 'admin';
  }

  // 3. Check Database (profiles / user_roles)
  const uid = userId || clerkUser?.id;
  if (uid) {
    try {
      const dbRole = await getProfileRole(uid);
      if (dbRole && dbRole !== 'user') return dbRole;
    } catch {
      // Fallback to user if DB query fails or not found
    }
  }

  return 'user';
};

export const getDefaultRouteForRole = (role: AppRole): string => {
  switch (role) {
    case 'super_admin': case 'admin': case 'manager': case 'developer': case 'writer': return '/admin';
    case 'dealer': return '/dealer';
    case 'farmer': return '/farmer';
    default: return '/';
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  syncClerkUser: async (clerkUser: ClerkUserLike) => {
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      null;

    const fullName =
      clerkUser.fullName ||
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      'User';

    const profilePicture = clerkUser.imageUrl || null;
    const userId = clerkUser.id || 'clerk-user';
    const role = await resolveUserRole(clerkUser, userId);

    // Persist user to Supabase database (profiles & user_roles tables)
    try {
      if (userId && userId !== 'clerk-user') {
        await (supabase.from('profiles') as any).upsert({
          id: userId,
          full_name: fullName,
          email: email,
          tenant_id: userId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        const { data: existingRoles } = await (supabase.from('user_roles') as any)
          .select('role')
          .eq('user_id', userId);

        if (!existingRoles || existingRoles.length === 0) {
          await (supabase.from('user_roles') as any).insert({
            user_id: userId,
            role: role,
          });
        }
      }
    } catch (e) {
      console.error('Error syncing Clerk user to Supabase profiles:', e);
    }

    set({
      user: {
        id: userId,
        email: email || undefined,
        user_metadata: {
          full_name: fullName,
          avatar_url: profilePicture,
        },
        ...clerkUser,
      } as any,
      profile: {
        id: userId,
        full_name: fullName,
        email: email,
        phone: null,
        country: null,
        profile_picture_url: profilePicture,
        is_organization_root: false,
        business_name: null,
        slug: null,
        logo_url: null,
        organization_status: null,
        role: role,
        tenant_id: userId,
        created_at: new Date().toISOString(),
      },
      loading: false,
    });
  },

  fetchProfile: async (userId: string) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        (supabase.from('user_roles') as any).select('role').eq('user_id', userId),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (!profileRes.data) { set({ profile: null, loading: false }); return; }
      const row = profileRes.data as any;
      const role = pickHighestPriorityRole((rolesRes.data as Array<{ role: AppRole }> | null | undefined) ?? []);
      const tenant_id = row.tenant_id ?? row.id ?? userId;

      set({
        profile: {
          id: row.id,
          full_name: row.full_name ?? null,
          email: row.email ?? null,
          phone: row.phone ?? null,
          country: row.country ?? null,
          profile_picture_url: row.profile_picture_url ?? null,
          is_organization_root: row.is_organization_root ?? false,
          business_name: row.business_name ?? null,
          slug: row.slug ?? null,
          logo_url: row.logo_url ?? null,
          organization_status: row.organization_status ?? null,
          role,
          tenant_id,
          created_at: row.created_at ?? new Date().toISOString(),
        },
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      set({ profile: null, loading: false });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    set({ user: null, profile: null, loading: false });
  },

  isAdmin: () => { const r = get().profile?.role; return r === 'admin' || r === 'super_admin'; },
  isSuperAdmin: () => get().profile?.role === 'super_admin',
  isDealer: () => get().profile?.role === 'dealer',
  isFarmer: () => get().profile?.role === 'farmer',
  isCustomer: () => { const r = get().profile?.role; return r === 'customer' || r === 'user'; },
  tenantId: () => get().profile?.tenant_id ?? null,
}));

