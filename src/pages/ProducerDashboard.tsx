import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ProductForm from '../ProductForm';
import ProfileEdit from '../ProfileEdit';
import MyProducts from '../MyProducts';

export default function ProducerDashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState(''); // Precisamos do ID para buscar os pedidos
  
  // ESTADOS PARA CONTROLAR A EDIÇÃO
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // NOVOS ESTADOS DA V2.0 (Abas e Pedidos)
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'produtos' | 'pedidos'>('produtos');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        navigate('/login');
      } else {
        // Verifica se é realmente um produtor
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (profile?.user_type !== 'produtor') {
          alert('Acesso negado: Esta área é apenas para produtores.');
          navigate('/'); // Chuta o usuário de volta pra home
          return;
        }

        setUserEmail(user.email || '');
        setUserId(user.id);
        fetchOrders(user.id); 
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleFormSuccess = () => {
    setEditingProduct(null);
    setRefreshKey(prev => prev + 1);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };

  // ==========================================
  // FUNÇÕES DA V2.0 (PEDIDOS)
  // ==========================================
  const fetchOrders = async (currentUserId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('producer_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar pedidos:', error);
    } else {
      setOrders(data || []);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('Erro ao atualizar status.');
    } else {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Painel do Produtor</h3>
        <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Sair
        </button>
      </div>

      <p style={{ color: '#666', marginBottom: '20px' }}>Bem-vindo, {userEmail}</p>
      
      {/* O perfil fica sempre visível no topo */}
      <ProfileEdit />
      <hr style={{ margin: '20px 0' }} />

      {/* NAVEGAÇÃO DAS ABAS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button 
          className={activeTab === 'produtos' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('produtos')}
          style={{ flex: 1, padding: '12px', fontSize: '16px', borderRadius: '6px', border: activeTab === 'produtos' ? 'none' : '1px solid #ccc', backgroundColor: activeTab === 'produtos' ? 'var(--primary)' : '#fff', color: activeTab === 'produtos' ? '#fff' : '#333', cursor: 'pointer' }}
        >
          📦 Meus Produtos
        </button>
        <button 
          className={activeTab === 'pedidos' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveTab('pedidos')}
          style={{ flex: 1, padding: '12px', fontSize: '16px', borderRadius: '6px', border: activeTab === 'pedidos' ? 'none' : '1px solid #ccc', backgroundColor: activeTab === 'pedidos' ? 'var(--primary)' : '#fff', color: activeTab === 'pedidos' ? '#fff' : '#333', cursor: 'pointer' }}
        >
          🛒 Meus Pedidos ({orders.filter(o => o.status === 'Novo').length})
        </button>
      </div>

      {/* ==========================================
          CONTEÚDO DA ABA: PRODUTOS
          ========================================== */}
      {activeTab === 'produtos' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <ProductForm 
            productToEdit={editingProduct} 
            onSuccess={handleFormSuccess}
            onCancel={handleCancelEdit}
          />
          <hr style={{ margin: '30px 0', borderTop: '1px solid #eee' }} />
          <MyProducts 
            key={refreshKey} 
            onEditClick={(product) => setEditingProduct(product)} 
          />
        </div>
      )}

      {/* ==========================================
          CONTEÚDO DA ABA: PEDIDOS
          ========================================== */}
      {activeTab === 'pedidos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.3s ease' }}>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f9f9f9', borderRadius: '8px', color: '#666' }}>
              <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>😴</span>
              Nenhum pedido recebido ainda.
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} style={{ padding: '20px', borderLeft: `5px solid ${order.status === 'Novo' ? '#28a745' : order.status === 'Cancelado' ? '#dc3545' : '#6c757d'}`, borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: '0 0 5px 0', color: '#333' }}>{order.customer_name}</h3>
                  <span style={{ 
                    fontWeight: 'bold',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    backgroundColor: order.status === 'Novo' ? '#e6ffe6' : order.status === 'Cancelado' ? '#ffe6e6' : '#f0f0f0',
                    color: order.status === 'Novo' ? '#28a745' : order.status === 'Cancelado' ? '#dc3545' : '#6c757d',
                    fontSize: '12px',
                    textTransform: 'uppercase'
                  }}>
                    {order.status}
                  </span>
                </div>
                
                <p style={{ margin: '5px 0 15px 0', fontSize: '15px', color: '#555' }}>
                  📱 WhatsApp: <strong>{order.customer_phone}</strong>
                </p>
                
                <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px', margin: '10px 0', border: '1px solid #eee' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#666', textTransform: 'uppercase' }}>Itens do Pedido:</div>
                  {order.items.map((item: any, index: number) => (
                    <div key={index} style={{ marginBottom: '5px', color: '#333' }}>
                      <span style={{ fontWeight: 'bold' }}>{item.qty}{item.unit}</span> - {item.name} <span style={{ color: '#666', fontSize: '13px' }}>(R$ {item.subtotal.toFixed(2)})</span>
                    </div>
                  ))}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                  <h4 style={{ margin: '0', fontSize: '18px', color: 'var(--primary)' }}>Total: R$ {order.total.toFixed(2)}</h4>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                
                {/* Botões de Ação só aparecem se o pedido for "Novo" */}
                {order.status === 'Novo' && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'Concluído')} 
                      style={{ flex: 1, padding: '12px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                    >
                      Concluir Pedido ✅
                    </button>
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'Cancelado')} 
                      style={{ flex: 1, padding: '12px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                    >
                      Cancelar ❌
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}