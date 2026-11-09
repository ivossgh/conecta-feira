import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Controla se é tela de Entrar ou Cadastrar

  // Campos do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<'cliente' | 'produtor'>('cliente');

  // Se já estiver logado, manda pro lugar certo
  useEffect(() => {
    checkUserAndRedirect();
  }, []);

  const checkUserAndRedirect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      redirectBasedOnRole(user.id);
    }
  };

  const redirectBasedOnRole = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();

    if (profile?.user_type === 'produtor') {
      navigate('/painel');
    } else {
      navigate('/');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // 1. Cria o usuário enviando os dados de perfil nos metadados (options.data)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              user_type: userType, // 'cliente' ou 'produtor'
            },
          },
        });

        if (authError) throw authError;

        // 2. Trata o retorno com base na sessão
        if (authData.session) {
          // Confirmação de e-mail desativada (login automático)
          alert('Conta criada com sucesso! Bem-vindo(a) ao Conecta Feira.');
          redirectBasedOnRole(authData.user!.id);
        } else if (authData.user) {
          // Confirmação de e-mail ativada (requer verificação na caixa de entrada)
          alert('Conta criada com sucesso! Enviamos um e-mail de confirmação para você.');
          setIsSignUp(false);
        }
      } else {
        // Apenas faz o Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (data.user) redirectBasedOnRole(data.user.id);
      }
    } catch (error: any) {
      alert(error.message || 'Erro ao autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '20px' }}>
      <div className="card" style={{ padding: '40px', width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h1 style={{ color: 'var(--primary)', margin: '0 0 10px 0' }}>🥬 Conecta Feira</h1>
          </Link>
          <p style={{ color: '#666', margin: 0 }}>
            {isSignUp ? 'Crie sua conta gratuitamente' : 'Acesse sua conta'}
          </p>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {isSignUp && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>Como você quer usar o sistema?</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button"
                    onClick={() => setUserType('cliente')}
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: userType === 'cliente' ? '2px solid var(--primary)' : '1px solid #ccc', backgroundColor: userType === 'cliente' ? '#e6ffe6' : '#fff', cursor: 'pointer' }}
                  >
                    🛒 Quero Comprar
                  </button>
                  <button 
                    type="button"
                    onClick={() => setUserType('produtor')}
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: userType === 'produtor' ? '2px solid var(--primary)' : '1px solid #ccc', backgroundColor: userType === 'produtor' ? '#e6ffe6' : '#fff', cursor: 'pointer' }}
                  >
                    🛖 Quero Vender
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Seu Nome Completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp}
                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '15px' }}
              />
            </>
          )}

          <input
            type="email"
            placeholder="Seu E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '15px' }}
          />
          <input
            type="password"
            placeholder="Sua Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '15px' }}
          />

          <button 
            type="submit" 
            disabled={loading} 
            className="btn-primary" 
            style={{ padding: '12px', fontSize: '16px', borderRadius: '6px', marginTop: '10px' }}
          >
            {loading ? 'Aguarde...' : isSignUp ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '14px' }}>
          {isSignUp ? (
            <span>Já tem uma conta? <strong onClick={() => setIsSignUp(false)} style={{ color: 'var(--primary)', cursor: 'pointer' }}>Faça login</strong></span>
          ) : (
            <span>Ainda não tem conta? <strong onClick={() => setIsSignUp(true)} style={{ color: 'var(--primary)', cursor: 'pointer' }}>Cadastre-se</strong></span>
          )}
        </div>
        
      </div>
    </div>
  );
}