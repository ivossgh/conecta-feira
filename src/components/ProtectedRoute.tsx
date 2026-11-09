import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  requiredRole?: 'cliente' | 'produtor';
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, userType, isLoading } = useAuth();

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

  // Se a rota exige um tipo específico e o usuário não bate com a exigência
  if (requiredRole && userType !== requiredRole) {
    alert('Acesso negado. Este painel é exclusivo para produtores.');
    return <Navigate to="/" replace />; // Redireciona para a home
  }

  // Libera a exibição da rota protegida
  return <Outlet />;
}