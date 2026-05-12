import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User as SupabaseAuthUser, Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { User, UserRole } from '../types/user';
import { apiFetch } from '../lib/api';

interface AuthContextType {
  currentUser: User | null;
  authUser: SupabaseAuthUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  changeEmailWithoutPassword: (newEmail: string) => Promise<void>;
  verifyEmailWithToken: (token: string) => Promise<void>;
  sendVerificationEmail: (email?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

type ProfileRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
  companyId: string | null;
  photoUrl: string | null;
  isEmailVerified: boolean | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

function mapProfile(row: ProfileRow): User {
  return {
    uid: row.id,
    email: row.email ?? '',
    displayName: row.displayName ?? '',
    role: (row.role as UserRole) || 'user',
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
    companyId: row.companyId ?? undefined,
    isEmailVerified: !!row.isEmailVerified,
    photoURL: row.photoUrl ?? undefined,
    status: (row.status as User['status']) || 'not-active',
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseAuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error || !data) {
        console.error('Error loading profile:', error);
        return null;
      }
      return mapProfile(data as ProfileRow);
    } catch (e) {
      console.error('Error loading user data:', e);
      return null;
    }
  };

  const refreshUser = async (userId: string) => {
    const u = await loadUserData(userId);
    setCurrentUser(u);
  };

  const register = async (email: string, password: string, displayName: string, role: UserRole = 'user') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role,
        },
      },
    });
    if (error) throw new Error(error.message);

    if (data.session) {
      setSession(data.session);
      setAuthUser(data.session.user);
      await refreshUser(data.session.user.id);
    }

    const res = await apiFetch('/api/auth/send-verification-by-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error || 'Failed to send verification email');
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAuthUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const res = await apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((j as { error?: string }).error || 'Failed to send reset email');
  };

  const sendVerificationEmail = async (emailArg?: string) => {
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (token) {
      const res = await apiFetch('/api/auth/send-verification', {
        method: 'POST',
        accessToken: token,
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || 'Failed to send verification email');
      }
      return;
    }
    const email = emailArg?.trim();
    if (!email) throw new Error('Email required');
    const res = await apiFetch('/api/auth/send-verification-by-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error || 'Failed to send verification email');
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!authUser) throw new Error('No user logged in');
    const row: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.displayName !== undefined) row.displayName = updates.displayName;
    if (updates.photoURL !== undefined) row.photoUrl = updates.photoURL;
    if (updates.companyId !== undefined) row.companyId = updates.companyId;
    if (updates.role !== undefined) row.role = updates.role;
    if (updates.isEmailVerified !== undefined) row.isEmailVerified = updates.isEmailVerified;
    if (updates.status !== undefined) row.status = updates.status;

    const { error } = await supabase.from('profiles').update(row).eq('id', authUser.id);
    if (error) throw new Error(error.message);

    if (updates.displayName !== undefined || updates.photoURL !== undefined) {
      const meta: Record<string, string> = {};
      if (updates.displayName !== undefined) meta.display_name = updates.displayName;
      if (updates.photoURL !== undefined) meta.avatar_url = updates.photoURL;
      await supabase.auth.updateUser({ data: meta });
    }

    if (currentUser) {
      const next = { ...currentUser, ...updates, updatedAt: new Date() };
      if (updates.isEmailVerified === true && next.status === 'not-active') {
        next.status = 'active';
        await supabase.from('profiles').update({ status: 'active', updatedAt: new Date().toISOString() }).eq('id', authUser.id);
      }
      setCurrentUser(next);
    }
  };

  const changeEmailWithoutPassword = async (newEmail: string) => {
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token;
    if (!token) throw new Error('No session');
    const res = await apiFetch('/api/auth/change-email', {
      method: 'POST',
      accessToken: token,
      body: JSON.stringify({ newEmail }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((j as { error?: string }).error || 'Failed to change email');
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        email: newEmail,
        isEmailVerified: false,
        updatedAt: new Date(),
      });
    }
    await supabase.auth.signOut();
  };

  const verifyEmailWithToken = async (token: string) => {
    const res = await apiFetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((j as { error?: string }).error || 'Verification failed');
    const { data: s } = await supabase.auth.getSession();
    if (s.session?.user) {
      await refreshUser(s.session.user.id);
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { session: sess } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(sess);
      setAuthUser(sess?.user ?? null);
      if (sess?.user) {
        const u = await loadUserData(sess.user.id);
        setCurrentUser(u);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    };
    void init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      setAuthUser(sess?.user ?? null);
      if (sess?.user) {
        const u = await loadUserData(sess.user.id);
        setCurrentUser(u);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    authUser,
    session,
    loading,
    login,
    register,
    logout,
    resetPassword,
    updateUserProfile,
    changeEmailWithoutPassword,
    verifyEmailWithToken,
    sendVerificationEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
