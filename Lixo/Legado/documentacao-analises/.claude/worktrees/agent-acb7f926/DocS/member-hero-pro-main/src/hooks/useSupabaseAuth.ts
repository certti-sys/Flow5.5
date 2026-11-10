import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useSupabaseAuth() {
  const authContext = useAuthContext();

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  };

  const signUp = async (name: string, email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      // Mesmo com erro (ex: session_not_found), permitimos logout local
      if (error) {
        console.warn('Logout warning (ignored):', error.message);
      }
      
      return { success: true };
    } catch (err) {
      console.warn('Logout exception (ignored):', err);
      return { success: true };
    }
  };

  return {
    ...authContext,
    signIn,
    signUp,
    signOut,
  };
}
