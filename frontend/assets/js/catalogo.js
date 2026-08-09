document.addEventListener('DOMContentLoaded', function () {
  var lista = document.querySelector('[data-filtro-lista]');
  var busca = document.querySelector('[data-filtro-busca]');
  var marca = document.querySelector('[data-filtro-marca]');
  var preco = document.querySelector('[data-filtro-preco-max]');
  var categoriaAtiva = 'todas';

  function aplicarFiltros() {
    if (!lista) return;
    var texto = (busca ? busca.value : '').trim().toLocaleLowerCase('pt-BR');
    var marcaAtiva = marca ? marca.value : 'todas';
    var precoMaximo = preco ? Number(preco.value) : Infinity;
    var visiveis = 0;
    lista.querySelectorAll('[data-filtro-item]').forEach(function (item) {
      var nome = (item.dataset.nome || '').toLocaleLowerCase('pt-BR');
      var categoria = item.dataset.categoria || '';
      var marcaDoItem = item.dataset.marca || '';
      var valor = Number(item.dataset.preco || 0);
      var mostrar = (!texto || nome.includes(texto) || categoria.toLocaleLowerCase('pt-BR').includes(texto) || marcaDoItem.toLocaleLowerCase('pt-BR').includes(texto)) &&
        (categoriaAtiva === 'todas' || categoria === categoriaAtiva) &&
        (marcaAtiva === 'todas' || marcaDoItem === marcaAtiva) && valor <= precoMaximo;
      item.hidden = !mostrar;
      if (mostrar) visiveis += 1;
    });
    document.querySelectorAll('[data-filtro-contagem]').forEach(function (saida) { saida.textContent = visiveis; });
    document.querySelectorAll('[data-filtro-vazio]').forEach(function (vazio) { vazio.hidden = visiveis !== 0; });
    document.querySelectorAll('[data-filtro-preco-saida]').forEach(function (saida) { saida.textContent = preco ? preco.valueAsNumber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''; });
  }

  document.querySelectorAll('[data-filtro-categoria]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      categoriaAtiva = botao.dataset.filtroCategoria;
      document.querySelectorAll('[data-filtro-categoria]').forEach(function (item) {
        var ativo = item === botao;
        item.classList.toggle('ativo', ativo);
        item.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      });
      aplicarFiltros();
    });
  });
  if (busca) busca.addEventListener('input', aplicarFiltros);
  if (marca) marca.addEventListener('change', aplicarFiltros);
  if (preco) preco.addEventListener('input', aplicarFiltros);
  document.querySelectorAll('[data-filtro-limpar]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      categoriaAtiva = 'todas';
      if (busca) busca.value = '';
      if (marca) marca.value = 'todas';
      if (preco) preco.value = preco.max;
      document.querySelectorAll('[data-filtro-categoria]').forEach(function (item) {
        var ativo = item.dataset.filtroCategoria === 'todas';
        item.classList.toggle('ativo', ativo);
        item.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      });
      aplicarFiltros();
    });
  });
  aplicarFiltros();

  var estoquePorNome = null;
  async function carregarEstoque() {
    if (estoquePorNome) return estoquePorNome;
    var tenis = await Sola.api('/tenis');
    estoquePorNome = {};
    tenis.forEach(function (item) { estoquePorNome[item.nome] = item.id_estoque; });
    return estoquePorNome;
  }
  document.addEventListener('click', async function (evento) {
    var botao = evento.target.closest('.produto-botao');
    if (!botao) return;
    var produto = botao.closest('.produto');
    var nome = produto && (produto.dataset.nome || (produto.querySelector('.produto-nome') || {}).textContent || '').trim();
    if (!localStorage.getItem('token')) { window.location.href = Sola.url('pages/publico/login.html'); return; }
    try {
      botao.disabled = true;
      var estoque = await carregarEstoque();
      if (!estoque[nome]) throw new Error('Este produto está sem estoque disponível.');
      await Sola.api('/carrinho/itens', { method: 'POST', body: JSON.stringify({ idEstoque: estoque[nome], quantidade: 1 }) });
      Sola.aviso('Produto adicionado ao carrinho.');
    } catch (erro) { Sola.aviso(erro.message); } finally { botao.disabled = false; }
  });

  var imagens = {};
  function dadosDaImagem(campo) {
    var produto = campo.closest('.produto');
    var contexto = produto || campo.parentElement;
    var nome = produto?.dataset.nome || contexto?.querySelector('.produto-nome, .carrinho-nome')?.textContent || '';
    var categoria = produto?.dataset.categoria || contexto?.querySelector('.produto-info, .carrinho-variacao')?.textContent || '';
    return { nome: nome.trim(), categoria: categoria.trim() };
  }
  document.querySelectorAll('.foto-exemplo').forEach(async function (campo) {
    var dados = dadosDaImagem(campo);
    if (!dados.nome) dados.nome = 'Tênis fechado';
    var chave = dados.nome + '|' + dados.categoria;
    try {
      if (!imagens[chave]) imagens[chave] = Sola.api('/imagens/tenis?q=' + encodeURIComponent(dados.nome) + '&categoria=' + encodeURIComponent(dados.categoria));
      var imagem = await imagens[chave];
      campo.style.backgroundImage = 'url("' + imagem.url.replace(/"/g, '%22') + '")';
      campo.setAttribute('role', 'img');
      campo.setAttribute('aria-label', imagem.alt);
      if (produto && !produto.querySelector('.produto-credito')) {
        var credito = document.createElement('a');
        credito.href = imagem.pagina; credito.target = '_blank'; credito.rel = 'noopener noreferrer';
        credito.textContent = 'Foto: ' + imagem.autor + ' / ' + imagem.fonte;
        credito.className = 'produto-credito';
        produto.querySelector('.produto-corpo').appendChild(credito);
      }
    } catch (_erro) { /* O placeholder permanece caso a fonte externa esteja indisponível. */ }
  });
});
