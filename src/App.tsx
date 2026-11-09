import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import Login from './pages/Login';
import ProducerDashboard from './pages/ProducerDashboard';
import CustomerHome from './pages/CustomerHome';
import ProducerStore from './pages/ProducerStore';
import CustomerOrders from './pages/CustomerOrders';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={<CustomerHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/loja/:id" element={<ProducerStore />} />

        {/* Rotas Privadas EXCLUSIVAS para Produtores */}
        <Route element={<ProtectedRoute requiredRole="produtor" />}>
          <Route path="/painel" element={<ProducerDashboard />} />
        </Route>

        {/* Rotas Privadas EXCLUSIVAS para Clientes */}
        <Route element={<ProtectedRoute requiredRole="cliente" />}>
          <Route path="/minhas-compras" element={<CustomerOrders />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;