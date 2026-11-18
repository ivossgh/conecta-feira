# Documentação técnica — Implementação do pagamento via PIX no Conecta Feira

**Projeto:** Conecta Feira  
**Funcionalidade:** Cadastro e visualização de chave PIX dos produtores  
**Tecnologias:** React, TypeScript, Supabase, PostgreSQL e React Router

---

# 1. Objetivo da implementação

O objetivo foi adicionar ao Conecta Feira uma funcionalidade para que os produtores possam cadastrar uma chave PIX em seus perfis e os clientes possam consultar essa chave diretamente na loja do produtor.

A funcionalidade foi planejada considerando três regras principais:

1. O produtor pode cadastrar e atualizar sua própria chave PIX.
2. Clientes autenticados podem consultar a chave PIX de qualquer produtor.
3. Visitantes que não estejam autenticados não podem visualizar as chaves PIX.

Também foi necessário garantir que a implementação não prejudicasse as funcionalidades que já existiam, como cadastro de produtos, carrinho de compras e fechamento de pedidos pelo WhatsApp.

# 2. Como a funcionalidade foi organizada

A implementação foi dividida em quatro partes:

| Parte | Responsabilidade |
|---|---|
| Supabase | Armazenar as chaves PIX e controlar as permissões |
| `PixEdit.tsx` | Permitir que o produtor cadastre e atualize sua chave |
| `ProducerDashboard.tsx` | Exibir o componente PIX no painel do produtor |
| `ProducerStore.tsx` | Consultar e exibir a chave para clientes autenticados |

O funcionamento geral é:

1. O produtor entra no painel.
2. O produtor cadastra sua chave PIX.
3. A chave é armazenada no banco de dados.
4. Um cliente autenticado acessa a loja do produtor.
5. O sistema verifica se o usuário é um cliente.
6. Se for um cliente, consulta a chave PIX do produtor.
7. A chave é apresentada na loja, com opção de copiar.

# 3. Primeira etapa — Criação da tabela no Supabase

## 3.1. Por que criar uma tabela separada?

O Conecta Feira já possuía uma tabela chamada `profiles`, responsável por armazenar informações dos usuários.

Essa tabela contém informações como:

- ID do usuário;
- Nome completo;
- Telefone;
- WhatsApp;
- Tipo de usuário;
- Foto de perfil.

Inicialmente, poderia parecer mais simples adicionar uma coluna `pix_key` diretamente em `profiles`.

Entretanto, essa tabela já possuía uma política de leitura pública para outras funcionalidades do sistema.

Adicionar uma chave PIX nessa tabela poderia expor essa informação para visitantes sem autenticação.

Por isso, decidimos criar uma tabela independente chamada:

`producer_payment_methods`

Essa separação permite estabelecer regras específicas de acesso para os dados financeiros.

## 3.2. Estrutura da tabela

No Supabase, acessamos o SQL Editor e executamos:

```sql
CREATE TABLE public.producer_payment_methods (
  producer_id UUID PRIMARY KEY
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  pix_key TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Entendendo cada coluna:

**producer_id**

- Armazena o ID do produtor.
- É uma chave estrangeira relacionada à tabela `profiles`.
- É também a chave primária da tabela.
- Cada produtor pode ter apenas um registro de chave PIX.

**pix_key**

- Armazena a chave PIX cadastrada pelo produtor.
- O tipo `TEXT` permite armazenar CPF, CNPJ, e-mail, telefone ou chave aleatória.
- O `NOT NULL` impede a criação de registros sem uma chave.

**created_at**

- Registra a data e o horário de criação do registro.
- O `DEFAULT NOW()` preenche automaticamente esse campo.

**ON DELETE CASCADE**

Caso o perfil do produtor seja excluído, o registro correspondente da tabela de pagamento também será excluído.

## 3.3. Relacionamento entre as tabelas

A estrutura ficou assim:

```text
profiles
   |
   | id
   |
   | relacionamento
   |
   v
producer_payment_methods
   |
   | producer_id
   | pix_key
   | created_at
```

O campo `producer_id` identifica a qual produtor pertence a chave PIX.

Isso permite consultar a chave de um produtor específico sem misturar os dados de pagamento com os demais dados públicos do perfil.

# 4. Segunda etapa — Configuração da segurança com RLS

Criar uma tabela separada não é suficiente.

Também precisamos definir quem pode consultar, cadastrar, atualizar e excluir informações.

Para isso, utilizamos o recurso RLS (Row Level Security) do PostgreSQL, disponível no Supabase.

O RLS permite estabelecer regras de acesso diretamente no banco de dados.

## 4.1. Ativação do RLS

Executamos:

```sql
ALTER TABLE public.producer_payment_methods
ENABLE ROW LEVEL SECURITY;
```

Com isso, as operações passam a depender das permissões e políticas configuradas.

## 4.2. Remoção das permissões anteriores

Executamos:

```sql
REVOKE ALL ON public.producer_payment_methods
FROM anon, authenticated;
```

Isso remove as permissões anteriormente concedidas aos papéis `anon` e `authenticated` nessa tabela.

Em seguida, concedemos somente as permissões necessárias:

```sql
GRANT SELECT ON public.producer_payment_methods
TO authenticated;

GRANT INSERT, UPDATE, DELETE
ON public.producer_payment_methods
TO authenticated;
```

Entendendo:

- `SELECT`: permite consultar informações.
- `INSERT`: permite cadastrar registros.
- `UPDATE`: permite atualizar registros.
- `DELETE`: permite excluir registros.
- `authenticated`: representa usuários autenticados no Supabase.

O papel `anon` não recebeu permissão de acesso.

## 4.3. Política de consulta

Executamos:

```sql
CREATE POLICY "Usuários autenticados podem consultar PIX"
ON public.producer_payment_methods
FOR SELECT
TO authenticated
USING (true);
```

Essa política permite que qualquer usuário autenticado consulte as chaves PIX.

Isso foi necessário porque os clientes precisam consultar a chave de produtores diferentes.

A política não libera consulta para visitantes anônimos.

## 4.4. Política de cadastro

```sql
CREATE POLICY "Produtor cadastra seu próprio PIX"
ON public.producer_payment_methods
FOR INSERT
TO authenticated
WITH CHECK (
  producer_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'produtor'
  )
);
```

Essa política verifica duas condições:

1. O ID do produtor informado precisa ser igual ao ID do usuário autenticado.
2. O perfil desse usuário precisa possuir `user_type = 'produtor'`.

Assim, um cliente não pode cadastrar uma chave PIX em nome de outro produtor.

## 4.5. Política de atualização

```sql
CREATE POLICY "Produtor altera seu próprio PIX"
ON public.producer_payment_methods
FOR UPDATE
TO authenticated
USING (
  producer_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'produtor'
  )
)
WITH CHECK (
  producer_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'produtor'
  )
);
```

Essa política garante que o produtor somente consiga atualizar o próprio registro.

O `USING` verifica qual registro pode ser alterado.

O `WITH CHECK` verifica se o registro continuará respeitando as regras depois da alteração.

## 4.6. Política de exclusão

```sql
CREATE POLICY "Produtor exclui seu próprio PIX"
ON public.producer_payment_methods
FOR DELETE
TO authenticated
USING (
  producer_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'produtor'
  )
);
```

Essa política permite que o produtor exclua somente a própria chave PIX.

**Observação:** a política foi criada no banco, mas ainda não implementamos o botão de exclusão no painel.

## 4.7. Atualização do schema do Supabase

Por último, executamos:

```sql
NOTIFY pgrst, 'reload schema';
```

Esse comando solicita que o PostgREST atualize seu cache do schema do banco de dados.

Isso ajuda a API do Supabase a reconhecer a nova tabela.

# 5. Terceira etapa — Criação do componente PixEdit.tsx

Depois de configurar o banco, criamos o arquivo:

`src/PixEdit.tsx`

A responsabilidade desse componente é permitir que o produtor gerencie sua chave PIX.

Ele possui três estados:

```tsx
const [pixKey, setPixKey] = useState('');
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
```

Entendendo os estados:

- `pixKey`: armazena temporariamente a chave digitada.
- `loading`: controla o carregamento da chave existente.
- `saving`: indica se o sistema está salvando os dados.

## 5.1. Carregamento da chave existente

Quando o componente é aberto, ele verifica o usuário autenticado:

```tsx
const { data: { user }, error: userError } =
  await supabase.auth.getUser();
```

Se existir um usuário autenticado, o sistema consulta a tabela:

```tsx
const { data, error } = await supabase
  .from('producer_payment_methods')
  .select('pix_key')
  .eq('producer_id', user.id)
  .maybeSingle();
```

Entendendo a consulta:

- `.from()` indica a tabela consultada.
- `.select('pix_key')` solicita somente a chave PIX.
- `.eq('producer_id', user.id)` filtra pelo ID do produtor autenticado.
- `.maybeSingle()` retorna um registro ou `null` quando ainda não existe uma chave cadastrada.

Se uma chave for encontrada:

```tsx
if (data) {
  setPixKey(data.pix_key);
}
```

O valor é colocado automaticamente no campo de edição.

Assim, quando o produtor voltar ao painel, poderá visualizar a chave que já cadastrou.

## 5.2. Cadastro e atualização da chave

A função responsável por salvar é `savePix`.

Primeiro, removemos espaços desnecessários:

```tsx
const key = pixKey.trim();
```

Depois, verificamos se o campo está preenchido:

```tsx
if (!key) {
  alert('Informe sua chave PIX.');
  return;
}
```

Em seguida, recuperamos o usuário autenticado:

```tsx
const { data: { user }, error: userError } =
  await supabase.auth.getUser();
```

Por fim, utilizamos `upsert()`:

```tsx
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
```

### O que é upsert?

O `upsert()` combina duas operações:

- Se o registro ainda não existir, realiza um cadastro.
- Se o registro já existir, atualiza as informações.

O parâmetro:

```tsx
onConflict: 'producer_id'
```

indica que o campo `producer_id`, que é chave primária, deve ser utilizado para identificar conflitos.

Isso evita criar vários registros de PIX para o mesmo produtor.

Depois do salvamento, exibimos:

```tsx
alert('Chave PIX salva com sucesso!');
```

Também atualizamos o estado local:

```tsx
setPixKey(key);
```

## 5.3. Interface do componente

O componente apresenta:

- Título Chave PIX;
- Texto explicativo;
- Campo de preenchimento;
- Botão Salvar chave PIX;
- Informação sobre os formatos aceitos.

O produtor pode utilizar CPF, CNPJ, e-mail, telefone ou chave aleatória.

**Importante:** na implementação atual, verificamos apenas se o campo não está vazio. Ainda não existe validação específica de formato ou titularidade da chave.

# 6. Quarta etapa — Integração no painel do produtor

Com o componente criado, precisamos adicioná-lo ao painel.

Arquivo:

`src/pages/ProducerDashboard.tsx`

Primeiro, adicionamos o import:

```tsx
import PixEdit from '../PixEdit';
```

Depois, localizamos a área de edição do perfil:

```tsx
{/* Perfil */}
<ProfileEdit />

<hr style={{ margin: '20px 0' }} />
```

E acrescentamos o componente PIX:

```tsx
{/* Perfil */}
<ProfileEdit />

{/* Chave PIX */}
<PixEdit />

<hr style={{ margin: '20px 0' }} />
```

Com isso, o painel passou a apresentar:

1. Informações do perfil do produtor.
2. Área de cadastro e edição da chave PIX.
3. Área de gerenciamento dos produtos.

Não foi necessário criar uma nova página ou rota.

# 7. Quinta etapa — Integração na loja do produtor

A parte seguinte foi permitir que o cliente visualizasse a chave PIX na loja.

Arquivo:

`src/pages/ProducerStore.tsx`

Essa página já possuía funcionalidades como:

- Identificação do produtor;
- Listagem de produtos;
- Filtros por categoria;
- Carrinho;
- Identificação do cliente;
- Registro de pedidos;
- Encaminhamento do pedido pelo WhatsApp.

A implementação do PIX precisava preservar todas essas funcionalidades.

## 7.1. Criação dos estados

Adicionamos:

```tsx
const [isCustomer, setIsCustomer] = useState(false);
const [pixKey, setPixKey] = useState('');
```

O primeiro estado controla se o usuário atual é um cliente.

O segundo armazena a chave PIX do produtor da loja visitada.

## 7.2. Identificação do usuário autenticado

A página utiliza:

```tsx
const { data: { user } } = await supabase.auth.getUser();
```

Se não existir usuário autenticado, a função termina:

```tsx
if (!user) return;
```

Isso significa que visitantes sem login não chegam à etapa de consulta da chave PIX.

Se existir usuário:

```tsx
setCurrentCustomerId(user.id);
```

O ID é armazenado para manter o vínculo do cliente com os pedidos.

## 7.3. Consulta do perfil do usuário

Depois, consultamos:

```tsx
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, phone, user_type')
  .eq('id', user.id)
  .single();
```

O sistema recupera:

- Nome completo;
- Telefone;
- Tipo de usuário.

Os dados continuam sendo utilizados para preencher automaticamente os campos do cliente.

A verificação do tipo de usuário é:

```tsx
if (profile.user_type === 'cliente' && id) {
  setIsCustomer(true);
}
```

Somente usuários classificados como `cliente` recebem autorização para visualizar o PIX na interface.

Produtores autenticados não entram nessa condição.

## 7.4. Consulta da chave PIX do produtor

Depois da identificação do cliente, consultamos a tabela de pagamentos:

```tsx
const { data: pixData, error } = await supabase
  .from('producer_payment_methods')
  .select('pix_key')
  .eq('producer_id', id)
  .maybeSingle();
```

Aqui existem duas identificações diferentes:

- `user.id`: identifica o cliente que está acessando a loja.
- `id`: identifica o produtor dono da loja, recebido pela rota através do `useParams()`.

Esse detalhe é importante.

O cliente consulta a chave PIX do produtor visitado, e não a própria chave.

Quando o resultado é encontrado:

```tsx
setPixKey(pixData?.pix_key || '');
```

Se o produtor ainda não cadastrou uma chave, o estado permanece vazio.

## 7.5. Exibição condicional do PIX

Depois da consulta, adicionamos o bloco visual no retorno do componente:

```tsx
{isCustomer && pixKey && (
  <div>
    {/* Informações de pagamento via PIX */}
  </div>
)}
```

Essa condição verifica duas coisas:

1. O usuário precisa ser um cliente autenticado.
2. O produtor precisa possuir uma chave PIX cadastrada.

Se qualquer uma dessas condições não for atendida, o bloco não será exibido.

Essa é a principal regra de exibição da funcionalidade.

## 7.6. Botão para copiar a chave

Também adicionamos um botão:

```tsx
<button
  onClick={() => {
    navigator.clipboard.writeText(pixKey)
      .then(() => alert('Chave PIX copiada!'))
      .catch(() => alert('Não foi possível copiar a chave PIX.'));
  }}
>
  Copiar chave
</button>
```

A função:

```tsx
navigator.clipboard.writeText(pixKey)
```

utiliza a API de área de transferência do navegador.

Quando o cliente clica no botão, a chave PIX é copiada.

Se a operação funcionar, o sistema apresenta uma confirmação.

Caso contrário, apresenta uma mensagem de erro.

A cópia normalmente exige um contexto seguro, como HTTPS ou localhost, e pode depender das permissões do navegador.

# 8. Sexta etapa — Compilação e testes

Depois das alterações, executamos:

```bash
npm run build
```

O comando verifica a compilação do projeto e identifica erros de TypeScript e de build.

O resultado foi positivo: a compilação ocorreu sem erros.

Em seguida, iniciamos o projeto localmente:

```bash
npm run dev
```

E realizamos os testes no navegador.

## 8.1. Teste como produtor

Entramos no painel do produtor e verificamos:

- O componente de chave PIX apareceu.
- O campo permitiu digitar a chave.
- O botão de salvar funcionou.
- O sistema apresentou a mensagem de sucesso.

Resultado observado:

**Chave PIX salva com sucesso!**

Isso confirmou que a integração entre o componente React e a tabela do Supabase estava funcionando.

## 8.2. Teste como cliente autenticado

Depois, entramos com uma conta de cliente e acessamos a loja do produtor.

Resultado observado:

A página apresentou:

**Barraca de Ivo Silva**

**Pagamento via PIX**

A chave cadastrada foi exibida:

`gestorivosilva@gmail.com`

Também foi disponibilizado o botão para copiar a chave.

Esse teste confirmou que o cliente autenticado conseguiu consultar o registro do produtor.

## 8.3. Teste como visitante sem login

Por último, abrimos uma janela anônima do navegador.

Acessamos a mesma loja sem entrar em uma conta.

Resultado observado:

- A loja continuou acessível.
- Os produtos continuaram disponíveis.
- A chave PIX não apareceu.

Esse comportamento corresponde à regra definida para visitantes.

# 9. Fluxo completo da funcionalidade

O funcionamento pode ser representado assim:

```text
              PRODUTOR
                 |
                 v
          Acessa o painel
                 |
                 v
          PixEdit.tsx
                 |
                 v
          Informa a chave
                 |
                 v
          Supabase
                 |
                 v
    producer_payment_methods
                 |
                 |
          CLIENTE ACESSA
             A LOJA
                 |
                 v
       Verifica autenticação
                 |
          +------+------+
          |             |
       Sem login      Com login
          |             |
          v             v
     Não consulta   Consulta perfil
       o PIX        do usuário
                        |
                        v
                É um cliente?
                  /       \
                Não       Sim
                |          |
                v          v
           Não exibe    Consulta PIX
             PIX           |
                           v
                    Exibe a chave
                           |
                           v
                    Botão Copiar
```

# 10. Estrutura final dos arquivos envolvidos

Os arquivos relacionados à funcionalidade são:

```text
src/
│
├── PixEdit.tsx
│
└── pages/
    │
    ├── ProducerDashboard.tsx
    │
    └── ProducerStore.tsx
```

Além deles, temos a tabela criada no banco:

```text
public.producer_payment_methods
```

Cada arquivo possui uma responsabilidade específica:

| Arquivo | Responsabilidade |
|---|---|
| `PixEdit.tsx` | Cadastro e atualização do PIX |
| `ProducerDashboard.tsx` | Integração do componente no painel |
| `ProducerStore.tsx` | Consulta e exibição do PIX para clientes |
| Supabase | Persistência dos dados e controle de acesso |

# 11. Segurança e limitações atuais

É importante compreender a diferença entre proteção da interface e proteção do banco.

A condição:

```tsx
{isCustomer && pixKey && (...)}
```

controla o que aparece na tela.

Entretanto, a proteção real dos dados depende das permissões e políticas RLS configuradas no Supabase.

Na configuração atual:

- Visitantes anônimos não possuem permissão de leitura na tabela.
- Usuários autenticados podem consultar as chaves PIX.
- Somente produtores podem cadastrar, atualizar e excluir seus próprios registros, conforme as políticas configuradas.

**Uma observação importante:** a política de leitura permite que qualquer usuário autenticado consulte as chaves PIX pelo Supabase, inclusive por chamadas diretas à API. A restrição para clientes, e não produtores, foi implementada na interface da loja. Se futuramente a regra exigir que nem mesmo produtores possam consultar as chaves de outros produtores, será necessário reforçar a autorização no banco, por exemplo, com uma função controlada ou outra estratégia de acesso.

Também é importante lembrar que:

- O cadastro atual não valida se a chave pertence realmente ao produtor.
- Ainda não existe botão de exclusão no painel.
- Não existe integração com uma instituição financeira.
- Não existe confirmação automática de pagamento.
- A exibição do PIX não significa que o pedido foi pago.

O pedido continua sendo registrado no sistema e encaminhado pelo WhatsApp, conforme o funcionamento anterior.

# 12. Conclusão

A implementação do PIX no Conecta Feira foi realizada separando as responsabilidades entre banco de dados, segurança, painel do produtor e loja do cliente.

A solução permite que cada produtor mantenha sua própria chave PIX, enquanto os clientes autenticados conseguem consultá-la na loja.

A utilização de uma tabela independente evita misturar informações de pagamento com os dados públicos dos perfis.

As políticas RLS acrescentam uma camada importante de segurança, restringindo as operações de escrita ao próprio produtor e impedindo a leitura por visitantes anônimos.

Os testes realizados confirmaram o funcionamento do cadastro e da consulta da chave PIX, além da ocultação da informação para visitantes sem login.

**Status da implementação:** funcionalidade básica de cadastro e visualização implementada e testada localmente.