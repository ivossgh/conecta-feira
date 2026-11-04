import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function CustomerHome() {
  const [producers, setProducers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // NOVO: Estados para saber se tem alguém logado e qual o tipo do perfil
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    
    // Verifica a sessão atual e o TIPO de usuário ao carregar a página
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setCurrentUser(user);
      
      if (user) {
        // Se tem usuário logado, vai no banco descobrir se é cliente ou produtor
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();
        
        if (profile) setUserType(profile.user_type);
      }
    });
  }, []);

  const fetchData = async () => {
    const { data: producersData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_type', 'produtor');
    
    if (producersData) setProducers(producersData);

    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('available', true);
    
    if (productsData) setAllProducts(productsData);
  };

  // Função para deslogar da página inicial
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserType(null); // Limpa o tipo de usuário também
  };

  // --- LÓGICA DE FILTRAGEM (CORRIGIDA E BLINDADA) ---
  const filteredProducts = searchTerm.length > 0 
    ? allProducts.filter(product => {
        // Blindagem: Se o nome ou categoria for vazio/null, usa string vazia ''
        const productName = (product.name || '').toLowerCase();
        const productCategory = (product.category || '').toLowerCase();
        const search = searchTerm.toLowerCase();

        return productName.includes(search) || productCategory.includes(search);
      })
    : [];

  const getProducerName = (ownerId: string) => {
    const producer = producers.find(p => p.id === ownerId);
    // Blindagem também no nome do produtor
    return (producer && producer.full_name) ? producer.full_name : 'Produtor Local';
  };

  return (
    <div className="container">
      {/* CABEÇALHO DINÂMICO (Muda dependendo do tipo de usuário) */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '15px', borderBottom: '1px solid #eee', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0, color: 'var(--primary)' }}>🥬 Conecta Feira</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Do campo direto pra sua mesa.</p>
        </div>
        
        <div>
          {currentUser ? (
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              
              {/* SÓ MOSTRA SE FOR CLIENTE */}
              {userType === 'cliente' && (
                <Link to="/minhas-compras" style={{ color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
                  🛍️ Minhas Compras
                </Link>
              )}
              
              {/* SÓ MOSTRA SE FOR PRODUTOR */}
              {userType === 'produtor' && (
                <Link to="/painel" style={{ color: '#333', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
                  🛖 Meu Painel
                </Link>
              )}

              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                Sair
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', padding: '8px 15px', borderRadius: '20px', fontSize: '14px' }}>
              Entrar / Cadastrar
            </Link>
          )}
        </div>
      </header>

      {/* BARRA DE PESQUISA */}
      <div style={{ marginBottom: '40px' }}>
        <input
          type="text"
          placeholder="🔍 O que você procura? (Ex: Tomate, Mel, Queijo...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '15px', 
            borderRadius: '50px', 
            border: '1px solid #ddd',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
            fontSize: '16px'
          }}
        />
      </div>

      {searchTerm.length > 0 ? (
        <div>
          <h3 style={{ marginBottom: '20px' }}>
            Encontramos {filteredProducts.length} produtos para "{searchTerm}":
          </h3>
          
          <div className="grid-products">
            {filteredProducts.map((product) => (
              <Link key={product.id} to={`/loja/${product.owner_id}`}>
                <div className="card" style={{ padding: '10px', height: '100%', boxSizing: 'border-box' }}>
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} 
                  />
                  <h4 style={{ margin: '0 0 5px 0' }}>{product.name}</h4>
                  
                  <div className="text-price">
                    R$ {product.price.toFixed(2)} <span className="text-unit">/ {product.unit || 'un'}</span>
                  </div>
                  
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', background: '#f0f0f0', padding: '5px', borderRadius: '4px', display: 'inline-block' }}>
                    📍 Banca de {getProducerName(product.owner_id).split(' ')[0]}
                  </div>
                </div>
              </Link>
            ))}
            
            {filteredProducts.length === 0 && (
              <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888' }}>
                Nenhum produto encontrado. Tente buscar outra coisa ou veja a lista de produtores.
              </p>
            )}
          </div>
        </div>
      ) : (
        // --- VISÃO PADRÃO: LISTA DE PRODUTORES ---
        <div>
          <h2 style={{ color: '#333', textAlign: 'center', marginBottom: '30px' }}>Produtores da Região</h2>
          <div className="grid-products">
            {producers.map((producer) => (
              <Link key={producer.id} to={`/loja/${producer.id}`}>
                <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
                  <div style={{ fontSize: '50px', marginBottom: '15px' }}>👨‍🌾</div>
                  <h3 style={{ marginBottom: '5px', color: '#333' }}>{producer.full_name || 'Produtor'}</h3>
                  <span className="btn-secondary" style={{ fontSize: '12px', borderRadius: '20px', padding: '4px 12px', display: 'inline-block', marginTop: '10px' }}>
                    Visitar Barraca
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}