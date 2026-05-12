import { supabase } from '../config/supabase';

export const auth = {};

export async function createUserWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string
): Promise<{ user: { uid: string } }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: email.split('@')[0],
        role: 'company',
      },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Signup failed');
  return { user: { uid: data.user.id } };
}

export async function updateProfile(_user: unknown, _updates: { displayName?: string; photoURL?: string }) {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session?.user) return;
  await supabase.auth.updateUser({
    data: {
      display_name: _updates.displayName,
    },
  });
}

export async function updatePassword(_user: unknown, _newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: _newPassword });
  if (error) throw error;
}

export async function reauthenticateWithCredential(_user: unknown, _cred: unknown) {
  /* Supabase updates password without separate reauth in client when session fresh */
}

export function EmailAuthProvider() {
  return { credential: () => ({}) };
}

export function getAuth() {
  return auth;
}
