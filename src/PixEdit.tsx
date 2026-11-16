
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function PixEdit() {
  const [pixKey, setPixKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPix = async () => {
      try {
        const { data: { user }, error: userError } =
          await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) return;

        const { data, error } = await supabase
          .from('producer_payment_methods')
          .select('pix_key')
          .eq('producer_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setPixKey(data.pix_key);
        }
      } catch (error) {
        console.error('Erro ao carregar chave PIX:', error);
        alert('Não foi possível carregar sua chave PIX.');
      } finally {
        setLoading(false);
      }
    };

    loadPix();
  }, []);

  const savePix = async () => {
    const key = pixKey.trim();

    if (!key) {
      alert('Informe sua chave PIX.');
      return;
    }

    try {
      setSaving(true);

      const { data: { user }, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await supabase
        .from('producer_payment_methods')
        .upsert(
          {
            producer_id: user.id,
            pix_key: key,
          },
          {
            onConflict: 'producer_id',
          }
        );

      if (error) throw error;

      setPixKey(key);
      alert('Chave PIX salva com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar chave PIX:', error);
      alert(error.message || 'Não foi possível salvar a chave PIX.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #ddd',
      }}
    >
      <h3 style={{ marginTop: 0 }}>💳 Chave PIX</h3>

      <p style={{ fontSize: '14px' }}>
        Cadastre sua chave PIX para que os clientes possam realizar pagamentos.
      </p>

      <input
        type="text"
        value={pixKey}
        onChange={(e) => setPixKey(e.target.value)}
        placeholder="Digite sua chave PIX"
        disabled={loading || saving}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px',
          borderRadius: '5px',
          border: '1px solid #ccc',
          marginBottom: '10px',
        }}
      />

      <button
        onClick={savePix}
        disabled={loading || saving}
        style={{
          padding: '9px 18px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {loading ? 'Carregando...' : saving ? 'Salvando...' : 'Salvar chave PIX'}
      </button>

      <small style={{ display: 'block', color: '#666', marginTop: '10px' }}>
        Pode ser CPF, CNPJ, e-mail, telefone ou chave aleatória.
      </small>
    </div>
  );
}
