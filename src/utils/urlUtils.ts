// Utility functions for URL formatting

/**
 * Converts a company name to a URL-friendly slug
 * @param name The company name to convert
 * @returns A URL-friendly version of the name
 */
export const getCompanySlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')       // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, '-')     // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')         // Trim - from start of text
    .replace(/-+$/, '');        // Trim - from end of text
};

/**
 * Gets a company's ID from Firestore by its slug
 * For future implementation if needed
 */
export const getCompanyIdFromSlug = async (slug: string): Promise<string | null> => {
  // This would be implemented to look up company ID by slug if needed
  // Currently we use ID directly in the URL alongside the slug
  return null;
};