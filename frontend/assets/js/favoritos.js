document.addEventListener('DOMContentLoaded', function () {
  var grade = document.getElementById('grade-produtos');

  if (!grade) {
    return;
  }

  var subtitulo = document.querySelector('.subtitulo-pagina');

  function textoDeContagem(quantidade) {
    if (quantidade === 1) {
      return quantidade + ' produto salvo';
    }

    return quantidade + ' produtos salvos';
  }

  function criarCartaoFavorito(tenis) {
    var cartao = document.createElement('div');
    cartao.className = 'produto';
    cartao.dataset.idTenis = tenis.id_tenis;

    if (tenis.id_estoque) {
      cartao.dataset.idEstoque = tenis.id_estoque;
    }

    var primeiraFoto = null;
    if (Array.isArray(tenis.fotos)) {
      primeiraFoto = tenis.fotos[0];
    }

    var estiloFoto = '';
    if (primeiraFoto) {
      estiloFoto = ' style="background-image:url(\'' + String(primeiraFoto).replace(/'/g, '%27') + '\')"';
    }

    var textoBotao = 'Indisponível no momento';
    if (tenis.id_estoque) {
      textoBotao = 'Adicionar ao carrinho';
    }

    cartao.innerHTML =
      '<button class="botao-icone produto-favorito" aria-label="Remover dos favoritos" title="Remover dos favoritos">' +
        '<svg class="icone icone-vermelho"><use href="#icone-coracao"></use></svg>' +
      '</button>' +
      '<div class="foto-exemplo foto-quadrada"' + estiloFoto + '></div>' +
      '<div class="produto-corpo">' +
        '<p class="produto-nome"></p>' +
        '<p class="produto-info"></p>' +
        '<div class="produto-rodape"><span class="produto-preco"></span></div>' +
        '<button class="botao botao-preto botao-pequeno produto-botao" type="button">' + textoBotao + '</button>' +
      '</div>';

    cartao.querySelector('.produto-nome').textContent = tenis.nome;
    cartao.querySelector('.produto-info').textContent = [tenis.marca, tenis.categoria].filter(Boolean).join(' · ');
    cartao.querySelector('.produto-preco').textContent = Sola.formatarPreco(tenis.preco);

    return cartao;
  }

  async function carregarFavoritos() {
    var favoritos = await Sola.api('/favoritos');
    grade.textContent = '';

    if (!favoritos.length) {
      grade.innerHTML = '<p class="texto-apoio">Você ainda não tem favoritos.</p>';
    } else {
      favoritos.forEach(function (tenis) {
        grade.appendChild(criarCartaoFavorito(tenis));
      });
    }

    if (subtitulo) {
      subtitulo.textContent = textoDeContagem(favoritos.length);
    }
  }

  function atualizarContagem() {
    var restantes = grade.querySelectorAll('.produto').length;

    if (subtitulo) {
      subtitulo.textContent = textoDeContagem(restantes);
    }

    if (!restantes) {
      grade.innerHTML = '<p class="texto-apoio">Você ainda não tem favoritos.</p>';
    }
  }

  grade.addEventListener('click', function (evento) {
    var botaoFavorito = evento.target.closest('.produto-favorito');

    if (!botaoFavorito || botaoFavorito.disabled) {
      return;
    }

    evento.stopPropagation();

    var cartao = evento.target.closest('.produto');
    botaoFavorito.disabled = true;

    Sola.api('/favoritos/' + cartao.dataset.idTenis, { method: 'DELETE' })
      .then(function () {
        cartao.remove();
        atualizarContagem();
      })
      .catch(function (erro) {
        botaoFavorito.disabled = false;
        Sola.erro(erro.message);
      });
  });

  carregarFavoritos().catch(function (erro) {
    Sola.erro(erro.message);
  });
});
