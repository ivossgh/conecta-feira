# 🛡️ Política de Segurança e Arquitetura RLS - Conecta Feira

Este documento descreve as políticas de segurança, isolamento de dados e sanitização aplicadas no projeto **Conecta Feira** utilizando **React + Supabase**.

---

## 1. Gestão de Chaves e Variáveis de Ambiente

- **Client Key (`VITE_SUPABASE_ANON_KEY`)**: Chave pública com privilégios restritos. Utilizada exclusivamente no front-end.
- **Service Role Key**: **JAMAIS** utilizada no aplicativo front-end ou versionada no repositório.
- **Arquivo `.env.local`**: Configurado no `.gitignore` para impedir o envio acidental de credenciais ao controle de versão.

---

## 2. Controles de Acesso ao Banco de Dados (Row Level Security - RLS)

### Tabela `public.profiles`
- **SELECT**: Público (`USING (true)`). Necessário para permitir a consulta de dados de contato (WhatsApp) dos produtores na vitrine.
- **UPDATE**: Restrito ao proprietário da conta (`auth.uid() = id`).
- **INSERT**: Automatizado via *Trigger* nativo do Postgres (`on_auth_user_created`).

### Tabela `public.products`
- **SELECT**: Público (`USING (true)`). Permite que visitantes e clientes visualizem a vitrine de produtos.
- **INSERT**: Exige autenticação (`auth.role() = 'authenticated'`) e valida que `owner_id` seja idêntico ao `auth.uid()`.
- **UPDATE**: Exige autenticação e valida que o usuário logado é o dono do registro (`auth.uid() = owner_id`).
- **DELETE**: Exige autenticação e restringe a remoção aos produtos do próprio produtor (`auth.uid() = owner_id`).

---

## 3. Sanitização e Segurança do Armazenamento (Storage)

### Bucket `produtos`
- **Visibilidade**: Público (somente leitura para exibição de imagens na vitrine).
- **Restrição de Tamanho**: Limite máximo de **2 MB** por arquivo.
- **Filtro de Conteúdo (MIME Types)**: Permitidos apenas `image/jpeg`, `image/png` e `image/webp`.

### Tratamento de Arquivos no Front-end
1. **Compressão e Metadados**: Utilização da biblioteca `browser-image-compression` para reduzir dimensões e remover metadados sensíveis (EXIF/GPS).
2. **Sanitização de Nomes**:
   - Remoção de acentuação e caracteres especiais via Regex (`[^a-zA-Z0-9.]`).
   - Prefixação com *Timestamp* dinâmico para garantir unicidade e evitar sobrescrita de arquivos.

---

## 4. Proteção de Rotas no Front-end (Guards)

- **Rotas Públicas**: Vitrine (`/`), Login (`/login`), Loja do Produtor (`/loja/:id`).
- **Rotas Protegidas**: Painel do Produtor (`/painel`), Meus Pedidos (`/minhas-compras`).
- **Implementação**: Componente `ProtectedRoute` integrado ao `AuthContext` para tratar os estados `loading`, `authenticated` e `unauthenticated`, impedindo a renderização de UI antes da validação da sessão.