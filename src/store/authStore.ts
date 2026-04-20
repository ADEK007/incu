import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  role: 'user' | 'admin' | 'manager' | 'developer' | 'writer';
  created_at: string;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: {
    product: {
      name: string;
      image_url: string;
    };
    quantity: number;
    price_at_time: number;
  }[];
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  orders: Order[];
  loading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: (userId: string) => Promise<void>;
  fetchOrders: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  orders: [],
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      set({ profile: data, loading: false });
    } catch (error) {
      console.error('Error fetching profile:', error);
      set({ profile: null, loading: false });
    }
  },

  fetchOrders: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price_at_time,
            product:products (
              name,
              image_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ orders: data || [] });
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, orders: [], loading: false });
  },
}));
