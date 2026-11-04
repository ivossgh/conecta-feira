import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function CustomerOrders() {
  const navigate = useNavigate();
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verifica se o cliente está logado
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/login'); // Se não estiver, manda para o login
      } else {
        fetchMyOrders(user.id);
      }
    });
  }, [navigate]);

  // 2. Procura os pedidos do cliente no banco
  const fetchMyOrders = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomerOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '20px', textAlign: 'center' }}>Carregando seu histórico...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Link to="/" style={{ color: '#666', fontSize: '14px', textDecoration: 'none' }}>← Voltar para a Feira</Link>
        <h3 style={{ margin: 0 }}>🛍️ Minhas Compras</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {customerOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '8px', color: '#666' }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>🛒</span>
            Você ainda não fez nenhuma compra pelo Conecta Feira.
          </div>
        ) : (
          customerOrders.map((order) => (
            <div key={order.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ 
                  fontWeight: 'bold', 
                  padding: '4px 10px', 
                  borderRadius: '20px',
                  fontSize: '11px',
                  backgroundColor: order.status === 'Novo' ? '#e6ffe6' : order.status === 'Cancelado' ? '#ffe6e6' : '#f0f0f0',
                  color: order.status === 'Novo' ? '#28a745' : order.status === 'Cancelado' ? '#dc3545' : '#6c757d',
                  textTransform: 'uppercase'
                }}>
                  {order.status}
                </span>
              </div>

              <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                    <strong>{item.qty}{item.unit}</strong> - {item.name}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '16px' }}>
                  Total: R$ {order.total.toFixed(2)}
                </span>
                
                {/* Botão facilitador para refazer o pedido no futuro */}
                <button 
                  onClick={() => navigate(`/loja/${order.producer_id}`)}
                  style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                >
                  Comprar Novamente 🔄
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}