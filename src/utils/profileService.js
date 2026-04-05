import { supabase } from './supabase';

// ── In-memory cache: { [lowerAddress]: { name, pfp } } ──
let profileCache = {};

/**
 * Load ALL profiles from Supabase into the in-memory cache.
 * Called once during boot. Returns the cache object.
 */
export async function loadAllProfiles() {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('wallet_address, display_name, pfp_url');

    if (error) throw error;
    const cache = {};
    (data || []).forEach(row => {
      cache[row.wallet_address.toLowerCase()] = {
        name: row.display_name || null,
        pfp: row.pfp_url || null,
      };
    });
    profileCache = cache;
    return cache;
  } catch (err) {
    console.error('Failed to load profiles from Supabase:', err);
    return {};
  }
}

/**
 * Get a profile from the in-memory cache (synchronous).
 */
export function getCachedProfile(address) {
  if (!address) return null;
  return profileCache[address.toLowerCase()] || null;
}

/**
 * Get the full profile cache (for context providers).
 */
export function getProfileCache() {
  return profileCache;
}

/**
 * Fetch a single profile directly from Supabase (async, for fresh data).
 */
export async function fetchProfile(address) {
  if (!supabase || !address) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('wallet_address, display_name, pfp_url')
      .eq('wallet_address', address.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    if (data) {
      const profile = { name: data.display_name, pfp: data.pfp_url };
      profileCache[address.toLowerCase()] = profile;
      return profile;
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch profile:', err);
    return getCachedProfile(address);
  }
}

/**
 * Save a display name. Returns { success, error }.
 * Enforces uniqueness — Supabase UNIQUE constraint will reject duplicates.
 */
export async function saveDisplayName(address, name) {
  if (!supabase) return { success: false, error: 'Profile service not configured' };
  if (!address || !name?.trim()) return { success: false, error: 'Name cannot be empty' };

  const trimmed = name.trim();
  const lower = address.toLowerCase();

  try {
    // Check if the name is already taken by ANOTHER user
    const { data: existing } = await supabase
      .from('profiles')
      .select('wallet_address')
      .ilike('display_name', trimmed)
      .single();

    if (existing && existing.wallet_address.toLowerCase() !== lower) {
      return { success: false, error: 'That name is already taken! Choose a different one.' };
    }

    // Upsert the profile
    const { error } = await supabase
      .from('profiles')
      .upsert({
        wallet_address: lower,
        display_name: trimmed,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'wallet_address' });

    if (error) {
      // Unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'That name is already taken! Choose a different one.' };
      }
      throw error;
    }

    // Update local cache
    if (!profileCache[lower]) profileCache[lower] = {};
    profileCache[lower].name = trimmed;

    // Also keep localStorage as a fallback
    localStorage.setItem(`profile_name_${lower}`, trimmed);

    return { success: true };
  } catch (err) {
    console.error('Failed to save name:', err);
    return { success: false, error: err.message || 'Failed to save name' };
  }
}

/**
 * Save a PFP URL for the given wallet. Returns { success, error }.
 */
export async function saveProfilePfp(address, pfpUrl) {
  if (!supabase) return { success: false, error: 'Profile service not configured' };
  if (!address) return { success: false, error: 'No address' };

  const lower = address.toLowerCase();

  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        wallet_address: lower,
        pfp_url: pfpUrl || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'wallet_address' });

    if (error) throw error;

    // Update local cache
    if (!profileCache[lower]) profileCache[lower] = {};
    profileCache[lower].pfp = pfpUrl;

    // Also keep localStorage as fallback
    localStorage.setItem(`profile_pfp_${lower}`, pfpUrl || '');

    return { success: true };
  } catch (err) {
    console.error('Failed to save PFP:', err);
    return { success: false, error: err.message || 'Failed to save PFP' };
  }
}
