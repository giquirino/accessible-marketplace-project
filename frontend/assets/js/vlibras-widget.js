(function () {
  if (window.__solaVlibrasInicializado) return;
  window.__solaVlibrasInicializado = true;

  var orientacoes = [
    [/index\.html$/, 'Página inicial', 'Nesta página você conhece a Last Dance Club e vê tênis em destaque. Use o catálogo para buscar produtos ou entre na sua conta para acompanhar pedidos.'],
    [/publico\/login\.html$/, 'Entrar na conta', 'Preencha seu e-mail e senha. Selecione Entrar para acessar sua conta. Caso ainda não tenha uma conta, selecione Criar uma conta.'],
    [/publico\/cadastro\.html$/, 'Criar conta', 'Preencha seu nome, e-mail e senha. Confirme a senha, aceite os termos de uso e selecione Criar conta para concluir o cadastro.'],
    [/publico\/catalogo\.html$/, 'Catálogo de tênis', 'Use a busca, as categorias e o botão Filtros para encontrar tênis. Selecione Adicionar ao carrinho depois de escolher um produto.'],
    [/cliente\/catalogo\.html$/, 'Catálogo de tênis', 'Pesquise por nome, marca ou categoria. Use os filtros para limitar os resultados e selecione Adicionar ao carrinho quando encontrar o produto desejado.'],
    [/cliente\/carrinho\.html$/, 'Meu carrinho', 'Revise seus itens, ajuste as quantidades e selecione Ir para o checkout para continuar a compra.'],
    [/cliente\/checkout-endereco\.html$/, 'Endereço de entrega', 'Preencha os dados do endereço. Use Avançar para ir ao pagamento ou Voltar para retornar ao carrinho.'],
    [/cliente\/checkout-pagamento\.html$/, 'Pagamento', 'Escolha uma forma de pagamento, confira os dados e selecione Confirmar para concluir o pedido.'],
    [/cliente\/confirmacao-pedido\.html$/, 'Pedido confirmado', 'O pedido foi concluído. Use Meus pedidos no menu para acompanhar a entrega.'],
    [/cliente\/(cliente-dashboard|meus-pedidos|pedido-detalhe|favoritos|avaliacoes|avaliar-tenis|minha-conta)\.html$/, 'Área do cliente', 'Use o menu lateral para acessar pedidos, favoritos, avaliações e os dados da sua conta. Os botões de cada tela informam as ações disponíveis.'],
    [/vendedor\/vendedor-tenis-form\.html$/, 'Cadastrar tênis', 'Preencha os dados do produto e selecione Salvar ou Publicar para concluir. Use Cancelar ou Voltar caso não queira continuar.'],
    [/vendedor\/vendedor-(dashboard|tenis|estoque|pedidos|avaliacoes|dados-loja|minha-conta)\.html$/, 'Área do vendedor', 'Use o menu lateral para cadastrar tênis, atualizar estoque, acompanhar pedidos e configurar os dados da loja.'],
    [/admin\/admin-(dashboard|moderacao|categorias|marcas|usuarios|pedidos-pagamentos|minha-conta)\.html$/, 'Área administrativa', 'Use o menu lateral para moderar conteúdos, administrar categorias, marcas, usuários e pedidos. Confirme ou cancele cada ação nos botões da tela.']
  ];
  function obterOrientacao() {
    var rota = location.pathname;
    return orientacoes.find(function (item) { return item[0].test(rota); }) || ['geral', 'Navegação nesta página', 'Esta página apresenta informações e ações da Last Dance Club. Use os títulos, campos e botões identificados para concluir o fluxo atual.'];
  }
  var SEM_ORIENTACAO = [/\/publico\/(login|cadastro)\.html$/, /(^|\/)index\.html$/, /\/$/];

  function inserirOrientacao() {
    if (SEM_ORIENTACAO.some(function (padrao) { return padrao.test(location.pathname); })) return;
    var alvo = document.querySelector('main');
    if (!alvo || document.getElementById('orientacao-pagina')) return;
    var dados = obterOrientacao(), secao = document.createElement('section');
    secao.className = 'orientacao-vlibras'; secao.setAttribute('aria-labelledby', 'orientacao-pagina');
    secao.innerHTML = '<h2 id="orientacao-pagina"></h2><p></p><p class="orientacao-vlibras-dica">Para ver esta orientação em Libras, selecione o texto e use o botão de acessibilidade do VLibras.</p>';
    secao.querySelector('h2').textContent = dados[1]; secao.querySelector('p').textContent = dados[2]; alvo.insertBefore(secao, alvo.firstChild);
  }
  function montarWidget() {
    if (document.querySelector('[vw]')) return;
    var container = document.createElement('div'); container.setAttribute('vw', ''); container.className = 'enabled';
    container.innerHTML = '<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
    document.body.appendChild(container);
    var script = document.createElement('script'); script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js'; script.async = true;
    script.onload = function () { if (window.VLibras && window.VLibras.Widget) new window.VLibras.Widget('https://vlibras.gov.br/app'); };
    script.onerror = function () { console.error('Não foi possível carregar o VLibras Widget.'); };
    document.head.appendChild(script);
  }
  function iniciar() { inserirOrientacao(); montarWidget(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
