import { supabase } from '../config/supabase';

export const storage = {};

export function ref(_storage: unknown, path: string): { fullPath: string } {
  return { fullPath: path };
}

export async function uploadBytes(
  r: { fullPath: string },
  data: Blob | File
): Promise<{ ref: { fullPath: string } }> {
  const ct = data instanceof File ? data.type : 'application/octet-stream';
  const { error } = await supabase.storage.from('media').upload(r.fullPath, data, { upsert: true, contentType: ct });
  if (error) throw error;
  return { ref: r };
}

export async function getDownloadURL(r: { fullPath: string }): Promise<string> {
  return supabase.storage.from('media').getPublicUrl(r.fullPath).data.publicUrl;
}

export async function deleteObject(r: { fullPath: string }): Promise<void> {
  const { error } = await supabase.storage.from('media').remove([r.fullPath]);
  if (error) throw error;
}
