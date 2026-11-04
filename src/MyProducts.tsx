import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// Recebemos uma função "onEditClick" do Pai
interface MyProductsProps {
  onEditClick: (product: any) => void;
}

export default function MyProducts({ onEditClick }: MyProductsProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyProducts();
  }, []);

  const fetchMyProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setProducts(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(products.filter(p => p.id !== id));
      alert("Produto removido!");
    } else {
      alert("Erro ao excluir!");
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>📦 Gerenciar Meu Estoque</h3>
      {products.length === 0 ? <p style={{ color: '#666' }}>Nenhum produto cadastrado.</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {products.map((product) => (
            <li key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee', backgroundColor: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={product.image_url} alt={product.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                <div>
                  <strong>{product.name}</strong>
                  <div style={{ color: 'green', fontSize: '14px' }}>R$ {product.price.toFixed(2)} / {product.unit}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>{product.category}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                
                {/* BOTÃO EDITAR NOVO */}
                <button 
                  onClick={() => onEditClick(product)}
                  style={{ backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✏️ Editar
                </button>

                <button 
                  onClick={() => handleDelete(product.id)}
                  style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}