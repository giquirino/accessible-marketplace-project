document.addEventListener('DOMContentLoaded', function () {
  var listaEnderecos = document.querySelector('#area-checkout > div');
  var formularioEndereco = document.querySelector('#dialogo-endereco form');

  if (!listaEnderecos || !formularioEndereco) {
    return;
  }

  var nomeDoCliente = document.querySelector('.cartao-endereco .negrito').textContent;

  function selecionarEndereco(cartaoSelecionado) {
    listaEnderecos.querySelectorAll('.cartao-endereco').forEach(function (cartao) {
      cartao.classList.remove('escolhido');
    });

    cartaoSelecionado.classList.add('escolhido');
  }

  listaEnderecos.addEventListener('click', function (evento) {
    var cartao = evento.target.closest('.cartao-endereco');

    if (cartao) {
      selecionarEndereco(cartao);
    }
  });

  formularioEndereco.addEventListener('submit', function () {
    var cep = document.getElementById('novo-cep').value;
    var endereco = document.getElementById('novo-endereco').value;
    var cidade = document.getElementById('nova-cidade').value;
    var estado = document.getElementById('novo-estado').value;

    var cartao = document.createElement('div');
    cartao.className = 'cartao-endereco';
    cartao.innerHTML =
      '<div class="endereco-topo"><span class="negrito"></span></div>' +
      '<p class="texto-nota"></p>';

    cartao.querySelector('.negrito').textContent = nomeDoCliente;
    cartao.querySelector('.texto-nota').textContent = endereco + ' — ' + cidade + ' - ' + estado + ', ' + cep;

    var botaoAdicionar = document.querySelector('[data-abrir="dialogo-endereco"]');
    listaEnderecos.insertBefore(cartao, botaoAdicionar);
    selecionarEndereco(cartao);

    formularioEndereco.reset();
  });
});
