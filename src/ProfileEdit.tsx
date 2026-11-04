import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

export default function ProfileEdit() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Busca o telefone atual quando a tela abre
  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();
      
      if (data?.phone) setPhone(data.phone);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Sem usuário logado');

      const { error } = await supabase
        .from('profiles')
        .update({ phone: phone })
        .eq('id', user.id);

      if (error) throw error;
      alert('WhatsApp atualizado com sucesso!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ddd' }}>
      <h3 style={{ marginTop: 0 }}>📞 Contato para Vendas</h3>
      <p style={{ fontSize: '14px' }}>Cadastre seu Zap para receber pedidos:</p>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ex: 89999990000"
          style={{ flex: 1, padding: '8px' }}
        />
        <button 
          onClick={updateProfile} 
          disabled={loading}
          style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {loading ? '...' : 'Salvar'}
        </button>
      </div>
      <small style={{ color: '#666' }}>Coloque apenas números com DDD (Ex: 89912345678)</small>
    </div>
  );
}