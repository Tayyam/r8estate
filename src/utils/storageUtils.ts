import { supabase } from '../config/supabase';

const BUCKET = 'media';

export const uploadCompanyLogo = async (file: File, companyId: string): Promise<string> => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload an image file (JPEG, PNG, GIF, or WebP)');
  }
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size too large. Please upload an image under 5MB');
  }
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `company-logos/${companyId}_${timestamp}.${fileExtension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const deleteCompanyLogo = async (logoUrl: string): Promise<void> => {
  try {
    const marker = `/object/public/${BUCKET}/`;
    const idx = logoUrl.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(logoUrl.slice(idx + marker.length).split('?')[0]);
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (e) {
    console.error('Error deleting logo:', e);
  }
};
