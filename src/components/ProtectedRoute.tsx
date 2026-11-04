import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  // Trava a renderização da interface até o Supabase responder
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Carregando Conecta Feira...</p>
      </div>
    );
  }

  // Se não houver usuário logado, redireciona para a tela de login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Libera a exibição da rota protegida
  return <Outlet />;
}