# 👟 Sola — Marketplace de Tênis

Protótipo navegável de um marketplace de tênis com **três painéis completos** — cliente,
vendedor e administrador — construído em HTML, CSS e JavaScript puros, sem framework e
sem etapa de build.

> **Projeto final de DAD — Instituto J&F**

---

##  A ideia

Um marketplace não é uma loja: é uma plataforma onde **três papéis diferentes** convivem e
dependem uns dos outros. O cliente compra, o vendedor abastece e atende, o administrador
mantém a plataforma saudável. Cada um enxerga um sistema diferente.

A proposta do Sola foi justamente **não simplificar isso**. Em vez de desenhar só a vitrine
(a parte bonita e fácil), modelamos os três lados inteiros — inclusive as telas sem glamour,
como moderação de anúncios, controle de estoque e conciliação de pagamentos. É onde um
marketplace de verdade realmente vive.

O visual parte de uma decisão editorial: **quase tudo em preto, branco e areia**. Cor no Sola
é informação, não enfeite — verde, amarelo e vermelho aparecem só para comunicar status
(aprovado, pendente, recusado). Assim quem usa aprende que *cor significa alguma coisa*, e o
produto — o tênis — fica sendo o único elemento colorido da tela.

---

##  Diferenciais

**Os três painéis, completos.** 31 telas: 11 do cliente, 8 do vendedor, 7 do admin e 4
públicas. O fluxo de compra vai do catálogo até a avaliação pós-entrega, passando por
carrinho, endereço, pagamento, confirmação e acompanhamento do pedido.

**Zero dependência, zero build.** Abre com duplo clique no `index.html` e funciona — sem npm,
sem servidor, sem compilar. O `Sola.raiz` deduz o caminho da aplicação a partir do próprio
`<script>`, então os redirecionamentos funcionam igual na raiz, dentro de `pages/<papel>/` e
até no protocolo `file://`.

**Design system próprio em CSS puro.** 26 variáveis em `:root` controlam cor, tipografia,
raio de canto, sombra, e as durações e curvas de animação. Trocar um token muda o site
inteiro de forma coerente. Tipografia em Archivo (títulos) e Public Sans (texto).

**JavaScript modular, não um `main.js` gigante.** 6 arquivos com uma responsabilidade cada
(autenticação, catálogo, diálogos, navegação, animações e o núcleo compartilhado). O maior
tem 92 linhas, o menor tem 13 — dá para ler qualquer um de uma sentada. O JS cobre só
interação de interface (abrir/fechar, animar, trocar aba, detectar tipo de usuário no
login); não há lógica de busca, filtro, carrinho, favoritos ou avaliações — isso ficaria
por conta de um backend real.

**CSS escopado por página.** Cada tela tem um `id` no `<body>` (ex.: `#pagina-carrinho`) e,
quando precisa, um arquivo próprio em `assets/css/pages/`. Estilo de uma tela não vaza para
as outras.

**Acessibilidade tratada desde o começo, não remendada depois.** 271 `aria-label`,
55 `aria-labelledby`, 44 `aria-expanded` mantidos em sincronia pelo JS, `lang="pt-BR"` nas 31
páginas, foco visível com `:focus-visible` e os modais usando o elemento `<dialog>` nativo
(com `showModal()`, foco preso e Esc funcionando de graça). Quem pediu menos movimento no
sistema operacional é respeitado **duas vezes**: no CSS, via `prefers-reduced-motion`, e no
JS, via `Sola.prefereMenosMovimento()` — que desliga as animações de rolagem na origem, em
vez de só escondê-las.

**Responsivo de verdade.** Dois pontos de quebra (64rem e 40rem). No mobile o menu lateral
vira uma gaveta, com o botão anunciando o próprio estado para leitores de tela.

**Código em português.** Classes, variáveis, funções e comentários em pt-BR. Numa base
acadêmica feita em equipe, isso reduz atrito de leitura muito mais do que parece.

---

##  Como rodar

Abra o **`index.html`** no navegador. É só isso — não precisa instalar nem servir nada.

> A única coisa que vem da internet são as fontes (Google Fonts). Offline, o site cai
> elegantemente para as fontes do sistema.

---

##  Entrando nos três painéis

Não há backend: a autenticação é **simulada** e decide o painel pelo **domínio do e-mail**.
Qualquer senha serve. Isso existe para você conseguir visitar os três lados sem cadastro real.

| Painel | E-mail de teste | Vai para |
|---|---|---|
|  Cliente | `joao@gmail.com` *(qualquer domínio comum)* | `cliente-dashboard.html` |
|  Vendedor | `loja@vendedor.com` *(contém `@vendedor`)* | `vendedor-dashboard.html` |
|  Admin | `ana@admin.com` *(contém `@admin`)* | `admin-dashboard.html` |

A sessão fica no `localStorage` em duas chaves: **`usuarioAtual`** (nome, e-mail, tipo e data)
e **`tipoUsuario`**. Depois de entrar, o nome e as iniciais do avatar aparecem no menu e no
topo automaticamente.

**Para sair:** use o botão "Sair" no rodapé do menu lateral. Pelo console, `sair()` faz o
mesmo; `localStorage.clear()` também resolve.

Há ainda uma página que demonstra esse fluxo passo a passo:
[`pages/publico/demo-fluxo.html`](pages/publico/demo-fluxo.html).

---

##  Estrutura
```
index.html                      vitrine / porta de entrada
pages/
  publico/    (4)               login, cadastro, catálogo, demo do fluxo
  cliente/    (11)              dashboard, carrinho, checkout, pedidos, favoritos,
                                avaliações, conta
  vendedor/   (8)               dashboard, tênis, estoque, pedidos, avaliações,
                                dados da loja, conta
  admin/      (7)               dashboard, moderação, categorias, marcas, usuários,
                                pedidos e pagamentos, conta
assets/
  css/
    global.css                  design system, componentes e animações (usado por todas)
    pages/<pagina>.css          estilos exclusivos de uma tela
  js/
    core.js                     núcleo: Sola.raiz, Sola.url, avisos, reduced-motion
    autenticacao.js             login, cadastro, sessão e logout
    navegacao.js                menu lateral no mobile e sistema de abas
    dialogos.js                 modais com <dialog> nativo
    catalogo.js                 pílulas de status (só visual, sem filtrar dados)
    animacoes.js                entrada e revelação ao rolar
  icons/                        31 ícones em PNG
  img/                          logo e imagens
```

**Ordem dos scripts importa:** `core.js` carrega primeiro, porque todos os outros usam
`Sola.*`.

---

##  Sistema de ícones

Os ícones usam duas técnicas, cada uma onde funciona melhor:

- **PNG (`<img>`)** — para os ícones estáticos, que são a maioria (363 usos).
- **Sprite SVG (`<symbol>` + `<use>`)** — para os que **mudam de cor pelo CSS** (94 usos),
  como o coração de favoritar (cinza → vermelho) e a lixeira. PNG não acompanha
  `currentColor`; SVG sim.

No menu lateral, que tem fundo escuro, os PNG são invertidos para branco por filtro CSS —
exceto no item ativo, que tem fundo branco e por isso mantém o ícone preto.

---

##  Tecnologias

**HTML5** semântico · **CSS3** (variáveis, grid, flexbox, `@media`, `@keyframes`) ·
**JavaScript ES5** sem dependências · **localStorage** para a sessão ·
`<dialog>` nativo para os modais.

O JS foi escrito em ES5 (`var`, `function`) de propósito: roda em qualquer navegador sem
transpilar, o que combina com a decisão de não ter etapa de build.

---

##  Limites deste protótipo

Isto é um **protótipo de front-end para fins acadêmicos**. Não existe backend, e é importante
ser honesto sobre o que isso significa:

- A autenticação é simulada e **não tem nenhuma segurança** — o papel do usuário vem do texto
  do e-mail e é editável pelo `localStorage`.
- Os dados (produtos, pedidos, métricas dos dashboards) são fixos no HTML, para ilustrar as
  telas.
- Busca, filtro de catálogo, carrinho, favoritos, avaliações (estrelas) e troca de foto de
  perfil são **só visuais**: os elementos aparecem na tela, mas não há JS por trás fazendo
  nada funcionar — nem salvando estado, nem filtrando produtos.

Para virar produto, o caminho seria: API REST com banco de dados, autenticação real (JWT ou
OAuth) com senha criptografada, validação no servidor, HTTPS e proteção contra XSS/CSRF.

---

## 📄 Licença

Ver [LICENSE](LICENSE).
