import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string;
  owner_id: string;
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Busca os produtos assim que a tela carrega
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Busca produtos disponíveis e ordena pelos mais novos
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('available', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setProducts(data);
    } catch (error) {
      console.error('Erro ao buscar:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para abrir o WhatsApp com a mensagem pronta
  const handleBuy = async (product: Product) => {
    // 1. Primeiro buscamos o telefone do dono do produto
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', product.owner_id)
      .single();

    if (!profile?.phone) {
      alert("O produtor não cadastrou telefone!");
      return;
    }

    // 2. Formatamos a mensagem
    const message = `Olá! Gostaria de comprar: ${product.name} (R$ ${product.price})`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/55${profile.phone}?text=${encodedMessage}`;

    // 3. Abre o WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  if (loading) return <p style={{textAlign: 'center', marginTop: '20px'}}>Carregando feira...</p>;

  if (products.length === 0) return <p style={{textAlign: 'center', marginTop: '20px'}}>Nenhum produto na feira hoje 😔</p>;

  return (
    <div style={{ marginTop: '30px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>🥦VITRINE DA FEIRA🍎</h2>
      
      {/* Grid Responsivo (Se adapta ao celular) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
        gap: '15px' 
      }}>
        {products.map((product) => (
          <div key={product.id} style={{ 
            border: '1px solid #eee', 
            borderRadius: '10px', 
            padding: '10px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            backgroundColor: 'white'
          }}>
            {/* Imagem com tamanho fixo para não quebrar layout */}
            <img 
              src={product.image_url} 
              alt={product.name} 
              style={{ 
                width: '100%', 
                height: '120px', 
                objectFit: 'cover', 
                borderRadius: '8px' 
              }} 
            />
            
            <h4 style={{ margin: '10px 0 5px 0', fontSize: '16px' }}>{product.name}</h4>
            <p style={{ color: '#28a745', fontWeight: 'bold', margin: '0 0 10px 0' }}>
              R$ {product.price.toFixed(2)}
            </p>

            <button 
              onClick={() => handleBuy(product)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#25D366', // Cor do Zap
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Comprar no Zap 💬
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}