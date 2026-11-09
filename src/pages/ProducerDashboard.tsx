import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ProductForm from '../ProductForm';
import ProfileEdit from '../ProfileEdit';
import MyProducts from '../MyProducts';

export default function ProducerDashboard() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  
  // ESTADOS PARA CONTROLAR A EDIÇÃO
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ABA ATIVA (Removido 'pedidos' por enquanto)
  const [activeTab, setActiveTab] = useState<'produtos'>('produtos');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        navigate('/login');
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (profile?.user_type !== 'produtor') {
          alert('Acesso negado: Esta área é apenas para produtores.');
          navigate('/');
          return;
        }

        setUserEmail(user.email || '');
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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Painel do Produtor</h3>
        <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Sair
        </button>
      </div>

      <p style={{ color: '#666', marginBottom: '20px' }}>Bem-vindo, {userEmail}</p>
      
      {/* Perfil */}
      <ProfileEdit />
      <hr style={{ margin: '20px 0' }} />

      {/* ABA PRODUTOS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button 
          className="btn-primary"
          onClick={() => setActiveTab('produtos')}
          style={{ flex: 1, padding: '12px', fontSize: '16px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer' }}
        >
          📦 Meus Produtos
        </button>
      </div>

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
    </div>
  );
}