document.addEventListener('DOMContentLoaded', function () {
  var lista = document.querySelector('[data-filtro-lista]');
  var busca = document.querySelector('[data-filtro-busca]');
  var marca = document.querySelector('[data-filtro-marca]');
  var preco = document.querySelector('[data-filtro-preco-max]');
  var categoriaAtiva = 'todas';

  var dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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
    document.querySelectorAll('[data-filtro-preco-saida]').forEach(function (saida) { saida.textContent = preco ? dinheiro.format(preco.valueAsNumber) : ''; });
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

  function montarCard(tenis) {
    var card = document.createElement('div');
    card.className = 'produto';
    card.setAttribute('data-filtro-item', '');
    card.dataset.nome = tenis.nome;
    card.dataset.categoria = tenis.categoria || '';
    card.dataset.marca = tenis.marca || '';
    card.dataset.preco = tenis.preco;
    if (tenis.id_estoque) card.dataset.idEstoque = tenis.id_estoque;

    var favorito = document.createElement('button');
    favorito.className = 'botao-icone produto-favorito';
    favorito.type = 'button';
    favorito.title = 'Adicionar aos favoritos';
    favorito.setAttribute('aria-label', 'Adicionar aos favoritos: ' + tenis.nome);
    favorito.innerHTML = '<svg class="icone icone-cinza"><use href="#icone-coracao"></use></svg>';

    var foto = document.createElement('div');
    foto.className = 'foto-exemplo foto-quadrada';
    var primeiraFoto = Array.isArray(tenis.fotos) ? tenis.fotos[0] : null;
    if (primeiraFoto) {
      foto.style.backgroundImage = 'url("' + String(primeiraFoto).replace(/"/g, '%22') + '")';
      foto.setAttribute('role', 'img');
      foto.setAttribute('aria-label', tenis.nome);
    }

    var corpo = document.createElement('div');
    corpo.className = 'produto-corpo';

    var nome = document.createElement('p');
    nome.className = 'produto-nome';
    nome.textContent = tenis.nome;

    var info = document.createElement('p');
    info.className = 'produto-info';
    info.textContent = [tenis.marca, tenis.categoria].filter(Boolean).join(' · ');

    var rodape = document.createElement('div');
    rodape.className = 'produto-rodape';
    var valor = document.createElement('span');
    valor.className = 'produto-preco';
    valor.textContent = dinheiro.format(Number(tenis.preco));
    rodape.appendChild(valor);

    var acao = document.createElement('button');
    acao.className = 'botao botao-preto botao-pequeno produto-botao';
    acao.type = 'button';
    if (tenis.id_estoque) {
      acao.textContent = 'Adicionar ao carrinho';
      acao.setAttribute('aria-label', 'Adicionar ao carrinho: ' + tenis.nome);
    } else {
      acao.textContent = 'Sem estoque';
      acao.disabled = true;
    }

    corpo.append(nome, info, rodape, acao);
    card.append(favorito, foto, corpo);
    return card;
  }

  function preencherMarcas(tenisList) {
    if (!marca) return;
    var marcas = Array.from(new Set(tenisList.map(function (t) { return t.marca; }).filter(Boolean))).sort();
    marca.textContent = '';
    var todas = document.createElement('option');
    todas.value = 'todas';
    todas.textContent = 'Todas as marcas';
    marca.appendChild(todas);
    marcas.forEach(function (nome) {
      var opcao = document.createElement('option');
      opcao.value = nome;
      opcao.textContent = nome;
      marca.appendChild(opcao);
    });
  }

  async function carregarCatalogo() {
    if (!lista || !lista.querySelector('[data-filtro-item]')) return false;
    var tenisList = await Sola.api('/tenis');
    if (!Array.isArray(tenisList) || !tenisList.length) return false;
    lista.textContent = '';
    tenisList.forEach(function (tenis) { lista.appendChild(montarCard(tenis)); });
    preencherMarcas(tenisList);
    if (preco) {
      var maiorPreco = Math.max.apply(null, tenisList.map(function (t) { return Number(t.preco); }));
      var passo = Number(preco.step) || 1;
      var tetoAtual = Number(preco.max) || 0;
      if (Number.isFinite(maiorPreco) && maiorPreco > tetoAtual) {
        preco.max = Math.ceil(maiorPreco / passo) * passo;
        preco.value = preco.max;
      }
    }
    return true;
  }

  document.addEventListener('click', async function (evento) {
    var botao = evento.target.closest('.produto-botao');
    if (!botao || botao.disabled) return;
    var produto = botao.closest('.produto');
    var idEstoque = produto && produto.dataset.idEstoque;

    if (!Sola.logado()) { window.location.href = Sola.url('pages/publico/login.html'); return; }
    if (!idEstoque) {
      Sola.erro('Este produto é um exemplo da vitrine e ainda não está no catálogo real. Cadastre o tênis pelo painel do vendedor para poder comprá-lo.');
      return;
    }
    botao.disabled = true;
    try {
      await Sola.api('/carrinho/itens', { method: 'POST', body: JSON.stringify({ idEstoque: Number(idEstoque), quantidade: 1 }) });
      Sola.aviso('Produto adicionado ao carrinho.');
    } catch (erro) {
      Sola.erro(erro.message);
    } finally {
      botao.disabled = false;
    }
  });

  var imagens = {};
  function dadosDaImagem(campo) {
    var produto = campo.closest('.produto');
    var contexto = produto || campo.parentElement;
    var nome = (produto && produto.dataset.nome) || (contexto && contexto.querySelector('.produto-nome, .carrinho-nome') || {}).textContent || '';
    var categoria = (produto && produto.dataset.categoria) || (contexto && contexto.querySelector('.produto-info, .carrinho-variacao') || {}).textContent || '';
    return { produto: produto, nome: nome.trim(), categoria: categoria.trim() };
  }

  async function hidratarFoto(campo) {
    if (campo.style.backgroundImage) return;
    var dados = dadosDaImagem(campo);
    var produto = dados.produto;
    if (!dados.nome) dados.nome = 'Tênis fechado';
    var chave = dados.nome + '|' + dados.categoria;
    try {
      if (!imagens[chave]) imagens[chave] = Sola.api('/imagens/tenis?q=' + encodeURIComponent(dados.nome) + '&categoria=' + encodeURIComponent(dados.categoria));
      var imagem = await imagens[chave];
      campo.style.backgroundImage = 'url("' + imagem.url.replace(/"/g, '%22') + '")';
      campo.setAttribute('role', 'img');
      campo.setAttribute('aria-label', imagem.alt);
      var corpo = produto && produto.querySelector('.produto-corpo');
      if (corpo && !produto.querySelector('.produto-credito')) {
        var credito = document.createElement('a');
        credito.href = imagem.pagina;
        credito.target = '_blank';
        credito.rel = 'noopener noreferrer';
        credito.textContent = 'Foto: ' + imagem.autor + ' / ' + imagem.fonte;
        credito.className = 'produto-credito';
        corpo.appendChild(credito);
      }
    } catch (erro) {
      console.debug('Imagem de exemplo indisponível:', erro.message);
    }
  }

  function hidratarFotos() {
    document.querySelectorAll('.foto-exemplo').forEach(hidratarFoto);
  }

  carregarCatalogo()
    .catch(function (erro) { console.debug('Catálogo da API indisponível, mantendo a vitrine de exemplo:', erro.message); })
    .finally(function () { aplicarFiltros(); hidratarFotos(); });
});
