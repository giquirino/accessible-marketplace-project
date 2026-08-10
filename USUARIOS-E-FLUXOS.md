# Usuários de teste e fluxos

## Contas

Todas usam a mesma senha: `senha123`

| E-mail | Tipo | Cai em |
| --- | --- | --- |
| `admin@demo.local` | admin | `pages/admin/admin-dashboard.html` |
| `seller1@demo.local` | vendedor | `pages/vendedor/vendedor-dashboard.html` |
| `seller2@demo.local` | vendedor | `pages/vendedor/vendedor-dashboard.html` |
| `seller3@demo.local` | vendedor | `pages/vendedor/vendedor-dashboard.html` |
| `buyer@demo.local` | cliente | `pages/cliente/cliente-dashboard.html` |

## Como o perfil é definido

O perfil **não depende do e-mail**. Ele vem da coluna `tipo` da tabela `usuarios`, que entra no token JWT no login (`backend/src/auth.js`) e é lida pelo frontend para decidir o destino (`Sola.inicioPorTipo`, em `frontend/assets/js/core.js`).

Pelo cadastro do site só é possível criar `cliente` ou `vendedor` (`backend/src/validation.js`). **`admin` só é criado direto no banco** — de propósito, para ninguém virar administrador pela tela pública.

## Fluxo de acesso

1. O usuário entra em `pages/publico/login.html` e envia e-mail e senha.
2. `POST /api/auth/login` confere a senha com bcrypt e devolve o usuário mais o token.
3. O frontend guarda `token` e `tipoUsuario` no `localStorage`.
4. `guarda.js` (carregado por `core.js`) protege as páginas **pela pasta**:
   - `/pages/admin/` exige `admin`
   - `/pages/vendedor/` exige `vendedor`
   - `/pages/cliente/` exige `cliente`
5. Sem token, redireciona para o login. Com o perfil errado, manda para o painel do próprio perfil. Token expirado limpa a sessão e avisa na tela de login.

## Fluxo do cliente

Catálogo → produto → carrinho → checkout (endereço → pagamento) → confirmação → meus pedidos → avaliação.

## Fluxo do vendedor

Dashboard → cadastrar tênis (entra como `em_analise`) → estoque → pedidos → avaliações → dados da loja.

O vendedor precisa ter uma loja cadastrada antes de criar produtos: `POST /api/tenis` responde `409` se não existir registro em `lojas` para o usuário.

## Fluxo do admin

Dashboard → moderação (aprova ou recusa tênis) → categorias, marcas, usuários e pedidos/pagamentos.

## Observação sobre as senhas

As cinco contas demo foram inseridas no banco com a senha em texto puro, o que impedia o login (o `bcrypt.compare` sempre falhava). Foram regravadas com hash bcrypt mantendo a mesma senha. Se recarregar o banco a partir de um seed antigo, o problema volta — gere o hash com `gerarHash()` de `backend/src/auth.js` antes de inserir.
