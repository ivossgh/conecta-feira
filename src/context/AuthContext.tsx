
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  userType: 'cliente' | 'produtor' | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userType: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'cliente' | 'produtor' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    const fetchUserProfile = async (currentUser: User) => {
      const currentRequest = ++requestId;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', currentUser.id)
          .single();

        if (error) throw error;

        if (!mounted || currentRequest !== requestId) return;

        const type = data?.user_type;

        if (type === 'cliente' || type === 'produtor') {
          setUserType(type);
        } else {
          setUserType(null);
        }
      } catch (error) {
        console.error('Erro ao buscar perfil:', error);

        if (mounted && currentRequest === requestId) {
          setUserType(null);
        }
      } finally {
        if (mounted && currentRequest === requestId) {
          setIsLoading(false);
        }
      }
    };

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (!mounted) return;

        const currentUser = data.session?.user ?? null;

        setUser(currentUser);

        if (currentUser) {
          await fetchUserProfile(currentUser);
        } else {
          setUserType(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Erro ao inicializar sessão:', error);

        if (mounted) {
          setUser(null);
          setUserType(null);
          setIsLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;

      const currentUser = session?.user ?? null;

      setUser(currentUser);
      setUserType(null);

      if (!currentUser) {
        requestId++;
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // A consulta é executada fora do callback de autenticação.
      setTimeout(() => {
        if (mounted) {
          void fetchUserProfile(currentUser);
        }
      }, 0);
    });

    void initializeSession();

    return () => {
      mounted = false;
      requestId++;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userType, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
