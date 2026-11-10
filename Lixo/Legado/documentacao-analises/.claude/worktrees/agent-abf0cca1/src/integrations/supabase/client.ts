import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

/**
 * Custom Cookie Storage Adapter for Supabase Auth
 * Mitigates XSS risks by moving from LocalStorage to Cookies (SameSite=Lax)
 */
const CookieStorage = {
  getItem: (key: string): string | null => {
    const name = key + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    // Session cookie with SameSite=Lax for security
    // Only apply 'Secure' attribute for HTTPS connections to maintain Localhost (HTTP) compatibility
    const isSecure = window.location.protocol === 'https:';
    document.cookie = `${key}=${value}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  },
  removeItem: (key: string): void => {
    const isSecure = window.location.protocol === 'https:';
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: CookieStorage,
    flowType: 'pkce' // Recommended for better security in SPAs
  },
  global: {
    headers: {
      // Custom header for CSRF protection - validated by Edge Functions
      'X-Requested-With': 'XMLHttpRequest'
    }
  }
});
