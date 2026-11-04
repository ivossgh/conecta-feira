import { useState } from 'react';
import { supabase } from './lib/supabase';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Função para fazer Login
  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else alert('Login realizado com sucesso!');
    setLoading(false);
  };

  // Função para Criar Conta (Cadastro)
  const handleSignUp = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      alert(error.message);
    } else {
      alert('Cadastro realizado! Verifique seu e-mail para confirmar.');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '300px', margin: 'auto', padding: '20px' }}>
      <h2>Conecta Feira - Acesso</h2>
      <p style={{ fontSize: '16px', color: '#3baf22' }}>
        🍅 Faça login ou crie uma conta para gerenciar seus produtos!
      </p>
      
      <form style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '8px' }}
        />
        <input
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '8px' }}
        />
        
        <button onClick={handleLogin} disabled={loading} style={{ padding: '10px', cursor: 'pointer' }}>
          {loading ? 'Carregando...' : 'Entrar (Login)'}
        </button>
        
        <button onClick={handleSignUp} disabled={loading} style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#856a6a', color: 'black' }}>
          Cadastrar nova conta
        </button>
      </form>
    </div>
  );
}