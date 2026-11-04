import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Product {
  id: number; name: string; price: number; image_url: string; category: string; unit: string;
}

export default function ProducerStore() {
  const { id } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [producerName, setProducerName] = useState('');
  const [producerPhone, setProducerPhone] = useState('');
  const [cart, setCart] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Identificação do Cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(null); // Salva o ID do cliente logado
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => { if (id) fetchProducerAndProducts(id); }, [id]);

  useEffect(() => {
    selectedCategory === 'Todos' 
      ? setFilteredProducts(products) 
      : setFilteredProducts(products.filter(p => p.category === selectedCategory));
  }, [selectedCategory, products]);

  // NOVOS EFEITOS V2.0: Verifica se o cliente está logado para preencher os dados automaticamente
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentCustomerId(user.id);
        // Busca o nome e telefone do perfil do cliente no banco
        supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setCustomerName(profile.full_name || '');
              setCustomerPhone(profile.phone || '');
            }
          });
      }
    });
  }, []);

  const fetchProducerAndProducts = async (producerId: string) => {
    const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', producerId).single();
    if (profile) { setProducerName(profile.full_name); setProducerPhone(profile.phone); }
    const { data } = await supabase.from('products').select('*').eq('owner_id', producerId).eq('available', true);
    if (data) setProducts(data);
  };

  const addToCart = (p: Product) => setCart([...cart, p]);
  const removeFromCart = (p: Product) => {
    const index = cart.findIndex(item => item.id === p.id);
    if (index !== -1) { const newCart = [...cart]; newCart.splice(index, 1); setCart(newCart); }
  };

  const getQuantity = (id: number) => cart.filter(item => item.id === id).length;
  const totalCartValue = cart.reduce((acc, item) => acc + item.price, 0);

  const handleCheckout = async () => {
    if (!producerPhone) return alert('Produtor sem WhatsApp!');
    if (!customerName || !customerPhone) return alert('Por favor, preencha seu Nome e WhatsApp para continuarmos!');

    setIsCheckingOut(true);

    try {
      const summary: any = {};
      cart.forEach(item => {
        if (!summary[item.id]) summary[item.id] = { ...item, qty: 0, subtotal: 0 };
        summary[item.id].qty++; summary[item.id].subtotal += item.price;
      });
      const cartItemsFormatted = Object.values(summary);

      // Salva o pedido vinculando o customer_id (se o cliente estiver logado)
      const { error } = await supabase
        .from('orders')
        .insert([
          {
            producer_id: id,
            customer_id: currentCustomerId, // MÁGICA DA V2.0 AQUI 🪄
            customer_name: customerName,
            customer_phone: customerPhone,
            items: cartItemsFormatted,
            total: totalCartValue,
            status: 'Novo'
          }
        ]);

      if (error) throw error;

      let msg = `🛒 *Novo Pedido - Conecta Feira*\n\n`;
      msg += `👤 *Cliente:* ${customerName}\n`;
      msg += `📱 *Contato:* ${customerPhone}\n\n`;
      msg += `*Itens do Pedido:*\n`;

      cartItemsFormatted.forEach((i: any) => {
        msg += `▪️ ${i.qty}${i.unit} ${i.name} (R$ ${i.subtotal.toFixed(2)})\n`;
      });

      msg += `\n💰 *Total: R$ ${totalCartValue.toFixed(2)}*\n\n`;
      msg += `📍 *Status:* Pedido registrado no sistema!`;

      window.open(`https://wa.me/55${producerPhone}?text=${encodeURIComponent(msg)}`, '_blank');

      setCart([]);
      // Só limpa os campos se o usuário NÃO estiver logado
      if (!currentCustomerId) {
        setCustomerName('');
        setCustomerPhone('');
      }

    } catch (error: any) {
      console.error(error);
      alert('Erro ao registrar pedido. Tente novamente.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const categories = ['Todos', ...new Set(products.map(p => p.category || 'Outros'))];

  return (
    <div className="container" style={{ paddingBottom: cart.length > 0 ? '250px' : '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ color: '#666', fontSize: '14px', textDecoration: 'none' }}>← Voltar para a Feira</Link>
        {currentCustomerId && (
          <Link to="/minhas-compras" style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none' }}>
            🛍️ Ver Minhas Compras
          </Link>
        )}
      </div>

      <div style={{ margin: '20px 0 30px 0' }}>
        <h1 style={{ fontSize: '28px' }}>Barraca de {producerName || '...'} 🛖</h1>
      </div>

      <div className="tabs-container">
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setSelectedCategory(cat)}
            className={`tab-btn ${selectedCategory === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid-products" style={{ marginTop: '20px' }}>
        {filteredProducts.map((p) => {
          const qty = getQuantity(p.id);
          return (
            <div key={p.id} className="card" style={{ padding: '10px', position: 'relative', border: qty > 0 ? '2px solid var(--primary)' : '' }}>
              {qty > 0 && <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>{qty}</div>}
              
              <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{p.name}</h4>
                  <div className="text-price">R$ {p.price.toFixed(2)} <span className="text-unit">/ {p.unit}</span></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                {qty > 0 && <button onClick={() => removeFromCart(p)} className="btn-danger btn-icon">-</button>}
                <button onClick={() => addToCart(p)} className="btn-primary" style={{ flex: 1 }}>
                  {qty === 0 ? 'Adicionar' : '+'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="cart-bar" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total do Pedido</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>R$ {totalCartValue.toFixed(2)}</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Seu Nome Completo" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', backgroundColor: '#fff' }}
            />
            <input 
              type="text" 
              placeholder="Seu WhatsApp (Ex: 89 99999-0000)" 
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', backgroundColor: '#fff' }}
            />
            <button 
              onClick={handleCheckout} 
              disabled={isCheckingOut}
              className="btn-primary" 
              style={{ borderRadius: '6px', padding: '12px', marginTop: '5px', fontSize: '16px', fontWeight: 'bold' }}
            >
              {isCheckingOut ? 'Salvando Pedido...' : 'Fechar Pedido no WhatsApp 🚀'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}