document.addEventListener('DOMContentLoaded', function () {
  var opcoes = document.querySelectorAll('.opcao-pagamento');

  opcoes.forEach(function (opcao) {
    opcao.addEventListener('click', function (evento) {
      if (evento.target.closest('input')) {
        return;
      }

      var jaEscolhida = opcao.classList.contains('escolhido');

      opcoes.forEach(function (outraOpcao) {
        outraOpcao.classList.remove('escolhido');
      });

      if (!jaEscolhida) {
        opcao.classList.add('escolhido');
      }
    });
  });
});
