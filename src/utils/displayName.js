import { getCachedProfile } from './profileService';

/**
 * Resolve a display name for a wallet address.
 * Priority: Supabase cache → localStorage fallback → truncated address
 */
export function resolveDisplayName(address) {
  if (!address) return null;

  const lower = address.toLowerCase();

  // 1st: Check shared Supabase-backed cache (visible to all users)
  const cached = getCachedProfile(lower);
  if (cached?.name) {
    return { name: cached.name, source: 'supabase' };
  }

  // 2nd: Fallback to localStorage (local-only, legacy)
  const lowerKey = `profile_name_${lower}`;
  const exactKey = `profile_name_${address}`;
  let siteName = localStorage.getItem(lowerKey) || localStorage.getItem(exactKey);

  if (!siteName) {
    const keys = Object.keys(localStorage);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === lowerKey) {
        siteName = localStorage.getItem(keys[i]);
        break;
      }
    }
  }

  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
  return { name: siteName || truncated, source: siteName ? 'local' : 'address' };
}

/**
 * Resolve a PFP URL for a wallet address.
 * Priority: Supabase cache → localStorage fallback → null
 */
export function resolvePfp(address) {
  if (!address) return null;

  const lower = address.toLowerCase();

  // 1st: Check shared Supabase-backed cache
  const cached = getCachedProfile(lower);
  if (cached?.pfp) return cached.pfp;

  // 2nd: Fallback to localStorage
  return localStorage.getItem(`profile_pfp_${lower}`) || 
         localStorage.getItem(`profile_pfp_${address}`) || 
         null;
}
