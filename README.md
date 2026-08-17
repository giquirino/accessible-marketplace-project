# Last Dance Club — Marketplace de Tênis

Repositório organizado como monorepo, com o protótipo visual separado da API.

```text
frontend/                 site estático já criado
backend/                  API REST em Node.js + Express + PostgreSQL
  database/002_complementos.sql  migração adicional (fotos, favoritos, índices)
  database/003_perfil.sql        migração da foto de perfil
  database/004_logo_loja.sql     migração da logo da loja
  test/                          testes de unidade (node:test)
  .env.example             modelo de configuração local
```

Contas de teste e fluxos de cada perfil: [USUARIOS-E-FLUXOS.md](USUARIOS-E-FLUXOS.md).

## Backend

Pré-requisito: Node.js 20+ e o banco PostgreSQL com o schema do roteiro já executado.

```bash
npm install
Copy-Item backend/.env.example backend/.env
npm run dev
```

Preencha `backend/.env`:

- `DATABASE_URL` e `JWT_SECRET` (mínimo 32 caracteres) são obrigatórios.
- `FRONTEND_ORIGIN` aceita uma lista separada por vírgula — inclua o endereço local (Live Server) e o endereço publicado do frontend.
- `DATABASE_CA_CERT` deve receber o certificado da autoridade do seu provedor (na Aiven: "CA certificate"), para que a conexão TLS com o banco seja verificada de verdade. Enquanto não tiver esse certificado, defina `DATABASE_SSL_INSECURE=true` — mas isso desliga a verificação da cadeia e não deve ir para produção.

Esse arquivo é ignorado pelo Git e não deve ser enviado ao repositório.

Execute também, na ordem, `backend/database/002_complementos.sql`, `backend/database/003_perfil.sql` e `backend/database/004_logo_loja.sql` no banco.

A API inicia em `http://localhost:3000`. O front continua independente: abra `frontend/index.html` ou sirva essa pasta, por exemplo com a extensão Live Server. Se usar Live Server, mantenha `FRONTEND_ORIGIN=http://localhost:5500`.

Para publicar o frontend em outro domínio (GitHub Pages, por exemplo), defina `window.SOLA_API_URL` antes de carregar `core.js` apontando para a API publicada em HTTPS — sem isso, páginas fora de `localhost` avisam que a API não está configurada em vez de tentar `127.0.0.1`.

### Testes

```bash
npm test    # testes de unidade do backend (validação, autenticação)
```

### Solução de problemas

- **`npm` não é reconhecido no terminal**: o Node.js não está instalado ou não foi adicionado ao PATH do sistema. Instale a versão 20+ em [nodejs.org](https://nodejs.org) e abra um terminal novo depois de instalar.
- **`Variável obrigatória ausente: DATABASE_URL`**: o arquivo `.env` precisa estar dentro de `backend/`, não na raiz do repositório. O `backend/src/config.js` só lê `backend/.env`.
- **Acessar `http://localhost:3000/` no navegador mostra `{"erro":"Rota não encontrada."}`**: isso é esperado, a raiz `/` não é uma rota da API. Para confirmar que o backend está de pé e conectado ao banco, acesse `http://localhost:3000/api/saude`.
- **Erro de conexão TLS com o banco**: se ainda não tiver o certificado da autoridade (`DATABASE_CA_CERT`), defina `DATABASE_SSL_INSECURE=true` no `backend/.env` só para desenvolvimento local.

## Rotas implementadas

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/api/saude` | confirma conexão com a API e banco |
| POST | `/api/auth/cadastro` | cria cliente ou vendedor e seu carrinho |
| POST | `/api/auth/login` | retorna usuário e JWT |
| GET | `/api/perfil` | dados do usuário autenticado |
| PUT | `/api/perfil/foto` | atualiza a foto de perfil (data URL) |
| DELETE | `/api/perfil/foto` | remove a foto de perfil |
| GET | `/api/lojas/minha` | dados da loja do vendedor autenticado |
| PUT | `/api/lojas/logo` | atualiza a logo da loja (data URL) |
| DELETE | `/api/lojas/logo` | remove a logo da loja |
| GET | `/api/tenis` | catálogo; aceita `busca`, `marca`, `categoria` |
| POST | `/api/tenis` | cadastro de tênis por vendedor autenticado (entra como `em_analise`) |
| GET | `/api/carrinho` | itens do carrinho do usuário |
| POST | `/api/carrinho/itens` | adiciona/atualiza item do carrinho |
| POST | `/api/pedidos/finalizar` | cria pedido e baixa estoque numa transação |

Rotas autenticadas devem receber `Authorization: Bearer <token>`.

## O que está ligado à API e o que ainda é protótipo

O catálogo, o login/cadastro, a foto de perfil, a logo da loja e o carrinho (adicionar item) já conversam com a API. O restante das 28 telas do frontend (favoritos, avaliações, estoque do vendedor, painel administrativo, endereços/telefones) é protótipo visual: navegação e diálogos funcionam, mas ainda não persistem dados — não existem rotas nem tabelas para eles no backend.

## Acessibilidade

Toda página tem um link "Pular para o conteúdo" como primeiro elemento focalizável, o `<main>` recebe o foco após o pulo, avisos de erro ficam presos ao formulário com `role="alert"`/`aria-live`, e o campo de foto de perfil é operável pelo teclado (não fica escondido com `hidden`). A acessibilidade do servidor aparece principalmente na qualidade dos dados e das respostas: as fotos exigem `texto_alternativo`, a API devolve erros claros em português e valida todos os dados recebidos. Atendendo a todos os requisitos ensinados em aula.

## Segurança

Senhas são armazenadas com bcrypt, nunca em texto puro. A API usa JWT com expiração, validação Zod em toda rota (incluindo query strings), cabeçalhos de segurança, CORS restrito a uma lista configurável, TLS verificado por padrão na conexão com o banco e limite de tentativas nas rotas de autenticação e na busca de imagens. O tipo de conta enviado no cadastro só aceita `cliente`/`vendedor` — virar `admin` não é possível pela API — e todo produto novo entra como `em_analise`, nunca `ativo`, direto do cliente. Troque o segredo JWT antes de qualquer apresentação pública.
