import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  userType: 'cliente' | 'produtor' | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userType: null, isLoading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'cliente' | 'produtor' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Função blindada para buscar o perfil
    const fetchUserProfile = async (currentUser: User) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', currentUser.id)
          .single();
          
        if (!error && data) {
          setUserType(data.user_type as 'cliente' | 'produtor');
        } else {
          setUserType(null);
        }
      } catch (err) {
        console.error("Erro isolado ao buscar perfil:", err);
        setUserType(null);
      }
    };

    // 2. Busca a sessão inicial com garantia de finalização
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user);
        }
      } catch (error) {
        console.error("Erro ao carregar sessão inicial:", error);
      } finally {
        setIsLoading(false); // <--- GARANTIA: O loading SOME aconteça o que acontecer
      }
    };
    
    initializeSession();

    // 3. Escuta alterações em tempo real (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Ignora o evento INITIAL_SESSION para não conflitar com a busca inicial
      if (_event === 'INITIAL_SESSION') return;
      
      setIsLoading(true);
      try {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUserType(null);
        }
      } catch (error) {
        console.error("Erro na mudança de status:", error);
      } finally {
        setIsLoading(false); // <--- GARANTIA DE DESTRAVAMENTO DA TELA
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userType, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);