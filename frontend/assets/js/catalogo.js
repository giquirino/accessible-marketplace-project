document.addEventListener('DOMContentLoaded', function () {
  var lista = document.querySelector('[data-filtro-lista]');
  var busca = document.querySelector('[data-filtro-busca]');
  var marca = document.querySelector('[data-filtro-marca]');
  var preco = document.querySelector('[data-filtro-preco-max]');
  var categoriaAtiva = 'todas';

  function itemCombinaComTexto(item, texto) {
    if (!texto) {
      return true;
    }

    var nome = (item.dataset.nome || '').toLocaleLowerCase('pt-BR');
    var categoria = (item.dataset.categoria || '').toLocaleLowerCase('pt-BR');
    var marcaDoItem = (item.dataset.marca || '').toLocaleLowerCase('pt-BR');

    if (nome.includes(texto)) {
      return true;
    }

    if (categoria.includes(texto)) {
      return true;
    }

    if (marcaDoItem.includes(texto)) {
      return true;
    }

    return false;
  }

  function itemDeveAparecer(item, texto, precoMaximo, marcaSelecionada) {
    var categoria = item.dataset.categoria || '';
    var marcaDoItem = item.dataset.marca || '';
    var valor = Number(item.dataset.preco || 0);

    if (!itemCombinaComTexto(item, texto)) {
      return false;
    }

    if (categoriaAtiva !== 'todas' && categoria !== categoriaAtiva) {
      return false;
    }

    if (marcaSelecionada !== 'todas' && marcaDoItem !== marcaSelecionada) {
      return false;
    }

    if (valor > precoMaximo) {
      return false;
    }

    return true;
  }

  function aplicarFiltros() {
    if (!lista) {
      return;
    }

    var valorDaBusca = '';
    if (busca) {
      valorDaBusca = busca.value;
    }
    var texto = valorDaBusca.trim().toLocaleLowerCase('pt-BR');
    var precoMaximo = Infinity;
    if (preco) {
      precoMaximo = Number(preco.value);
    }
    var marcaSelecionada = 'todas';
    if (marca) {
      marcaSelecionada = marca.value;
    }
    var visiveis = 0;

    lista.querySelectorAll('[data-filtro-item]').forEach(function (item) {
      var mostrar = itemDeveAparecer(item, texto, precoMaximo, marcaSelecionada);

      item.hidden = !mostrar;

      if (mostrar) {
        visiveis += 1;
      }
    });

    document.querySelectorAll('[data-filtro-contagem]').forEach(function (saida) {
      saida.textContent = visiveis;
    });

    document.querySelectorAll('[data-filtro-vazio]').forEach(function (vazio) {
      vazio.hidden = visiveis !== 0;
    });

    document.querySelectorAll('[data-filtro-preco-saida]').forEach(function (saida) {
      if (preco) {
        saida.textContent = Sola.formatarPreco(preco.valueAsNumber);
      } else {
        saida.textContent = '';
      }
    });
  }

  document.querySelectorAll('[data-filtro-categoria]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      categoriaAtiva = botao.dataset.filtroCategoria;

      document.querySelectorAll('[data-filtro-categoria]').forEach(function (item) {
        var ativo = item === botao;
        item.classList.toggle('ativo', ativo);
        var valorAriaPressed = 'false';
        if (ativo) {
          valorAriaPressed = 'true';
        }
        item.setAttribute('aria-pressed', valorAriaPressed);
      });

      aplicarFiltros();
    });
  });

  if (busca) {
    var termoDaUrl = new URLSearchParams(location.search).get('busca');

    if (termoDaUrl) {
      busca.value = termoDaUrl;
    }

    busca.addEventListener('input', aplicarFiltros);
  }

  var buscaDoTopo = document.querySelector('.topo-busca input');

  if (buscaDoTopo) {
    buscaDoTopo.addEventListener('keydown', function (evento) {
      if (evento.key !== 'Enter') {
        return;
      }

      var termo = buscaDoTopo.value.trim();
      var parametroDeBusca = '';
      if (termo) {
        parametroDeBusca = '?busca=' + encodeURIComponent(termo);
      }
      window.location.href = 'catalogo.html' + parametroDeBusca;
    });
  }

  if (marca) {
    marca.addEventListener('change', aplicarFiltros);
  }

  if (preco) {
    preco.addEventListener('input', aplicarFiltros);
  }

  document.querySelectorAll('[data-filtro-limpar]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      categoriaAtiva = 'todas';

      if (busca) {
        busca.value = '';
      }

      if (marca) {
        marca.value = 'todas';
      }

      if (preco) {
        preco.value = preco.max;
      }

      document.querySelectorAll('[data-filtro-categoria]').forEach(function (item) {
        var ativo = item.dataset.filtroCategoria === 'todas';
        item.classList.toggle('ativo', ativo);
        var valorAriaPressed = 'false';
        if (ativo) {
          valorAriaPressed = 'true';
        }
        item.setAttribute('aria-pressed', valorAriaPressed);
      });

      aplicarFiltros();
    });
  });

  function montarCartaoDeProduto(tenis) {
    var cartao = document.createElement('div');
    cartao.className = 'produto';
    cartao.setAttribute('data-filtro-item', '');
    cartao.dataset.nome = tenis.nome;
    cartao.dataset.categoria = tenis.categoria || '';
    cartao.dataset.marca = tenis.marca || '';
    cartao.dataset.preco = tenis.preco;

    if (tenis.id_estoque) {
      cartao.dataset.idEstoque = tenis.id_estoque;
    }

    if (tenis.id_tenis) {
      cartao.dataset.idTenis = tenis.id_tenis;
    }

    var favorito = document.createElement('button');
    favorito.className = 'botao-icone produto-favorito';
    favorito.type = 'button';
    favorito.title = 'Adicionar aos favoritos';
    favorito.setAttribute('aria-label', 'Adicionar aos favoritos: ' + tenis.nome);
    favorito.innerHTML = '<svg class="icone icone-cinza"><use href="#icone-coracao"></use></svg>';

    var foto = document.createElement('div');
    foto.className = 'foto-exemplo foto-quadrada';

    var primeiraFoto = null;
    if (Array.isArray(tenis.fotos)) {
      primeiraFoto = tenis.fotos[0];
    }

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
    valor.textContent = Sola.formatarPreco(tenis.preco);
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
    cartao.append(favorito, foto, corpo);
    return cartao;
  }

  function preencherMarcas(listaDeTenis) {
    if (!marca) {
      return;
    }

    var nomesDeMarcas = listaDeTenis.map(function (tenisItem) {
      return tenisItem.marca;
    }).filter(Boolean);

    var marcas = Array.from(new Set(nomesDeMarcas)).sort();

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

  function ajustarTetoDePreco(listaDeTenis) {
    if (!preco) {
      return;
    }

    var precos = listaDeTenis.map(function (tenisItem) {
      return Number(tenisItem.preco);
    });

    var maiorPreco = Math.max.apply(null, precos);
    var passo = Number(preco.step) || 1;
    var tetoAtual = Number(preco.max) || 0;

    if (Number.isFinite(maiorPreco) && maiorPreco > tetoAtual) {
      preco.max = Math.ceil(maiorPreco / passo) * passo;
      preco.value = preco.max;
    }
  }

  async function carregarCatalogo() {
    if (!lista || !lista.querySelector('[data-filtro-item]')) {
      return false;
    }

    var listaDeTenis = await Sola.api('/tenis');

    if (!Array.isArray(listaDeTenis) || !listaDeTenis.length) {
      return false;
    }

    lista.textContent = '';

    listaDeTenis.forEach(function (tenis) {
      lista.appendChild(montarCartaoDeProduto(tenis));
    });

    preencherMarcas(listaDeTenis);
    ajustarTetoDePreco(listaDeTenis);

    return true;
  }

  document.addEventListener('click', function (evento) {
    var botaoFavorito = evento.target.closest('.produto-favorito');

    if (!botaoFavorito || botaoFavorito.disabled) {
      return;
    }

    var produto = botaoFavorito.closest('.produto');
    var idTenis = produto && produto.dataset.idTenis;

    if (!Sola.logado()) {
      window.location.href = Sola.url('pages/publico/login.html');
      return;
    }

    if (!idTenis) {
      Sola.erro('Este produto é um exemplo da vitrine e ainda não está no catálogo real.');
      return;
    }

    var coracao = botaoFavorito.querySelector('svg');
    var estaFavoritado = coracao.classList.contains('icone-vermelho');

    botaoFavorito.disabled = true;

    var pedido;
    if (estaFavoritado) {
      pedido = Sola.api('/favoritos/' + idTenis, { method: 'DELETE' });
    } else {
      pedido = Sola.api('/favoritos', { method: 'POST', body: JSON.stringify({ idTenis: Number(idTenis) }) });
    }

    pedido
      .then(function () {
        if (estaFavoritado) {
          coracao.classList.remove('icone-vermelho');
          coracao.classList.add('icone-cinza');
          botaoFavorito.title = 'Adicionar aos favoritos';
          botaoFavorito.setAttribute('aria-label', 'Adicionar aos favoritos');
        } else {
          coracao.classList.remove('icone-cinza');
          coracao.classList.add('icone-vermelho');
          botaoFavorito.title = 'Remover dos favoritos';
          botaoFavorito.setAttribute('aria-label', 'Remover dos favoritos');
        }
      })
      .catch(function (erro) {
        Sola.erro(erro.message);
      })
      .finally(function () {
        botaoFavorito.disabled = false;
      });
  });

  document.addEventListener('click', async function (evento) {
    var botao = evento.target.closest('.produto-botao');

    if (!botao || botao.disabled) {
      return;
    }

    var produto = botao.closest('.produto');
    var idEstoque = produto && produto.dataset.idEstoque;

    if (!Sola.logado()) {
      window.location.href = Sola.url('pages/publico/login.html');
      return;
    }

    if (!idEstoque) {
      Sola.erro('Este produto é um exemplo da vitrine e ainda não está no catálogo real. Cadastre o tênis pelo painel do vendedor para poder comprá-lo.');
      return;
    }

    botao.disabled = true;

    try {
      await Sola.api('/carrinho/itens', {
        method: 'POST',
        body: JSON.stringify({ idEstoque: Number(idEstoque), quantidade: 1 })
      });
      Sola.aviso('Produto adicionado ao carrinho.');
    } catch (erro) {
      Sola.erro(erro.message);
    } finally {
      botao.disabled = false;
    }
  });

  var imagens = {};

  function dadosDaImagem(elementoDaFoto) {
    var produto = elementoDaFoto.closest('.produto');
    var contexto = produto || elementoDaFoto.parentElement;

    var elementoNome = contexto && contexto.querySelector('.produto-nome, .carrinho-nome');
    var elementoCategoria = contexto && contexto.querySelector('.produto-info, .carrinho-variacao');

    var nome = (produto && produto.dataset.nome) || (elementoNome && elementoNome.textContent) || '';
    var categoria = (produto && produto.dataset.categoria) || (elementoCategoria && elementoCategoria.textContent) || '';

    return { produto: produto, nome: nome.trim(), categoria: categoria.trim() };
  }

  function adicionarCreditoDaFoto(produto, imagem) {
    var corpo = produto && produto.querySelector('.produto-corpo');

    if (!corpo || produto.querySelector('.produto-credito')) {
      return;
    }

    var credito = document.createElement('a');
    credito.href = imagem.pagina;
    credito.target = '_blank';
    credito.rel = 'noopener noreferrer';
    credito.textContent = 'Foto: ' + imagem.autor + ' / ' + imagem.fonte;
    credito.className = 'produto-credito';
    corpo.appendChild(credito);
  }

  async function hidratarFoto(elementoDaFoto) {
    if (elementoDaFoto.style.backgroundImage) {
      return;
    }

    var dados = dadosDaImagem(elementoDaFoto);
    var produto = dados.produto;

    if (!dados.nome) {
      dados.nome = 'Tênis fechado';
    }

    var chaveDeBusca = dados.nome + '|' + dados.categoria;

    try {
      if (!imagens[chaveDeBusca]) {
        imagens[chaveDeBusca] = Sola.api('/imagens/tenis?q=' + encodeURIComponent(dados.nome) + '&categoria=' + encodeURIComponent(dados.categoria));
      }

      var imagem = await imagens[chaveDeBusca];

      elementoDaFoto.style.backgroundImage = 'url("' + imagem.url.replace(/"/g, '%22') + '")';
      elementoDaFoto.setAttribute('role', 'img');
      elementoDaFoto.setAttribute('aria-label', imagem.alt);

      adicionarCreditoDaFoto(produto, imagem);
    } catch (erro) {
      console.debug('Imagem de exemplo indisponível:', erro.message);
    }
  }

  function hidratarFotos() {
    document.querySelectorAll('.foto-exemplo').forEach(hidratarFoto);
  }

  carregarCatalogo()
    .catch(function (erro) {
      console.debug('Catálogo da API indisponível, mantendo a vitrine de exemplo:', erro.message);
    })
    .finally(function () {
      aplicarFiltros();
      hidratarFotos();
    });
});
