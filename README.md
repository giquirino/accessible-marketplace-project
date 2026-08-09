# Sola — Marketplace de Tênis

Repositório organizado como monorepo, com o protótipo visual separado da API.

```text
frontend/                 site estático já criado
backend/                  API REST em Node.js + Express + PostgreSQL
  database/002_complementos.sql  migração adicional
  .env.example            modelo de configuração local
```

## Backend

Pré-requisito: Node.js 20+ e o banco PostgreSQL com o schema do roteiro já executado.

```bash
npm install
Copy-Item backend/.env.example backend/.env
npm run dev
```

Preencha `backend/.env` com a URL de conexão do banco e uma chave JWT aleatória. Esse arquivo é ignorado pelo Git e não deve ser enviado ao repositório.

Execute também `backend/database/002_complementos.sql` no banco. Ele cria fotos de tênis (incluindo texto alternativo obrigatório) e favoritos, além de índices para o catálogo.

A API inicia em `http://localhost:3000`. O front continua independente: abra `frontend/index.html` ou sirva essa pasta, por exemplo com a extensão Live Server. Se usar Live Server, mantenha `FRONTEND_ORIGIN=http://localhost:5500`.

## Rotas implementadas

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/api/saude` | confirma conexão com a API e banco |
| POST | `/api/auth/cadastro` | cria cliente ou vendedor e seu carrinho |
| POST | `/api/auth/login` | retorna usuário e JWT |
| GET | `/api/tenis` | catálogo; aceita `busca`, `marca`, `categoria` |
| POST | `/api/tenis` | cadastro de tênis por vendedor autenticado |
| GET | `/api/carrinho` | itens do carrinho do usuário |
| POST | `/api/carrinho/itens` | adiciona/atualiza item do carrinho |
| POST | `/api/pedidos/finalizar` | cria pedido e baixa estoque numa transação |

Rotas autenticadas devem receber `Authorization: Bearer <token>`.

## Acessibilidade no backend

A acessibilidade do servidor aparece principalmente na qualidade dos dados e das respostas: as fotos exigem `texto_alternativo`, a API devolve erros claros em português, valida todos os dados recebidos e preserva regras de acesso por perfil. A interface deverá associar cada imagem ao texto alternativo retornado e anunciar erros em uma região `aria-live`.

## Segurança

Senhas são armazenadas com bcrypt, nunca em texto puro. A API também usa JWT com expiração, validação Zod, cabeçalhos de segurança, CORS restrito e limite de tentativas nas rotas de autenticação. Troque o segredo JWT antes de qualquer apresentação pública.
