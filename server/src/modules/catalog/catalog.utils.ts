/**
 * Generates a URL-safe, lowercase, hyphenated slug from string input.
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // decompose combined graphemes
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // remove invalid characters
    .replace(/[\s_]+/g, '-') // collapse whitespace and underscores to a single dash
    .replace(/-+/g, '-') // collapse multiple dashes to single dash
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
};

/**
 * Escapes characters with special meaning in Regular Expressions.
 * Prevents regex injection when searching with MongoDB $regex.
 */
export const escapeRegex = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
