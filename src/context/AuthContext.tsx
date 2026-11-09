import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  userType: 'cliente' | 'produtor' | null; // Novo campo
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userType: null, isLoading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'cliente' | 'produtor' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Função para buscar o tipo de usuário no banco de dados
    const fetchUserProfile = async (currentUser: User) => {
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
    };

    // 1. Busca a sessão ativa ao carregar a aplicação
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user);
      }
      setIsLoading(false);
    });

    // 2. Escuta alterações em tempo real (login, logout, token expirado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoading(true);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUserType(null);
      }
      setIsLoading(false);
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