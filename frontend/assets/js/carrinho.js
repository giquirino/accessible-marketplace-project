document.addEventListener('DOMContentLoaded', function () {
  var listaDeItens = document.getElementById('itens-carrinho');

  if (!listaDeItens) {
    return;
  }

  var textoSubtotal = document.querySelector('[data-carrinho-subtotal]');
  var textoTotal = document.querySelector('[data-carrinho-total]');

  function criarLinhaDoItem(item) {
    var linha = document.createElement('div');
    linha.className = 'item-carrinho';
    linha.dataset.idItemCarrinho = item.id_item_carrinho;
    linha.dataset.idEstoque = item.id_em_estoque;
    linha.dataset.quantidade = item.quantidade;

    linha.innerHTML =
      '<div class="foto-exemplo foto-mini"></div>' +
      '<div class="carrinho-info">' +
        '<p class="carrinho-nome"></p>' +
        '<p class="carrinho-variacao"></p>' +
      '</div>' +
      '<div class="contador-qtd">' +
        '<button type="button" data-diminuir-quantidade aria-label="Diminuir quantidade">' +
          '<img class="icone icone-mini" src="../../assets/icons/icone-menos.png" alt="" />' +
        '</button>' +
        '<span data-quantidade></span>' +
        '<button type="button" data-aumentar-quantidade aria-label="Aumentar quantidade">' +
          '<img class="icone icone-mini" src="../../assets/icons/icone-add.png" alt="" />' +
        '</button>' +
      '</div>' +
      '<span class="carrinho-preco" data-subtotal-item></span>' +
      '<button class="botao-icone" type="button" data-remover-item aria-label="Remover item">' +
        '<img class="icone" src="../../assets/icons/icone-fechar.png" alt="" />' +
      '</button>';

    var variacao = 'Tamanho ' + item.tamanho;
    if (item.cor) {
      variacao += ' · ' + item.cor;
    }

    linha.querySelector('.carrinho-nome').textContent = item.nome;
    linha.querySelector('.carrinho-variacao').textContent = variacao;
    linha.querySelector('[data-quantidade]').textContent = item.quantidade;
    linha.querySelector('[data-subtotal-item]').textContent = Sola.formatarPreco(item.subtotal);

    return linha;
  }

  function atualizarResumo(itens) {
    var subtotal = itens.reduce(function (soma, item) {
      return soma + Number(item.subtotal);
    }, 0);

    if (textoSubtotal) {
      textoSubtotal.textContent = Sola.formatarPreco(subtotal);
    }
    if (textoTotal) {
      textoTotal.textContent = Sola.formatarPreco(subtotal);
    }
  }

  async function carregarCarrinho() {
    var itens = await Sola.api('/carrinho');
    listaDeItens.textContent = '';

    if (!itens.length) {
      listaDeItens.innerHTML = '<p class="texto-apoio">Seu carrinho está vazio.</p>';
    } else {
      itens.forEach(function (item) {
        listaDeItens.appendChild(criarLinhaDoItem(item));
      });
    }

    atualizarResumo(itens);
  }

  async function definirQuantidade(linha, novaQuantidade) {
    if (novaQuantidade < 1) {
      return;
    }

    await Sola.api('/carrinho/itens', {
      method: 'POST',
      body: JSON.stringify({ idEstoque: Number(linha.dataset.idEstoque), quantidade: novaQuantidade })
    });

    await carregarCarrinho();
  }

  async function removerItem(linha) {
    await Sola.api('/carrinho/itens/' + linha.dataset.idItemCarrinho, { method: 'DELETE' });
    await carregarCarrinho();
  }

  listaDeItens.addEventListener('click', function (evento) {
    var linha = evento.target.closest('.item-carrinho');

    if (!linha) {
      return;
    }

    if (evento.target.closest('[data-aumentar-quantidade]')) {
      definirQuantidade(linha, Number(linha.dataset.quantidade) + 1).catch(function (erro) {
        Sola.erro(erro.message);
      });
    } else if (evento.target.closest('[data-diminuir-quantidade]')) {
      definirQuantidade(linha, Number(linha.dataset.quantidade) - 1).catch(function (erro) {
        Sola.erro(erro.message);
      });
    } else if (evento.target.closest('[data-remover-item]')) {
      removerItem(linha).catch(function (erro) {
        Sola.erro(erro.message);
      });
    }
  });

  carregarCarrinho().catch(function (erro) {
    Sola.erro(erro.message);
  });
});
