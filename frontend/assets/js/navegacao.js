document.addEventListener('DOMContentLoaded', function () {

  var menuLateral = document.getElementById('menu-lateral');
  var botoesMenu = document.querySelectorAll('[data-abrir-menu]');

  if (menuLateral && botoesMenu.length) {

    var definirMenuLateral = function (aberto) {
      menuLateral.classList.toggle('aberto', aberto);
      botoesMenu.forEach(function (botao) {
        if (aberto) {
          botao.setAttribute('aria-expanded', 'true');
          botao.setAttribute('aria-label', 'Fechar menu');
        } else {
          botao.setAttribute('aria-expanded', 'false');
          botao.setAttribute('aria-label', 'Abrir menu');
        }
      });
    };

    botoesMenu.forEach(function (botao) {
      botao.addEventListener('click', function (evento) {
        evento.stopPropagation();
        var estaAberto = menuLateral.classList.contains('aberto');
        definirMenuLateral(!estaAberto);
      });
    });

    document.addEventListener('click', function (evento) {
      if (!menuLateral.classList.contains('aberto')) {
        return;
      }

      if (!menuLateral.contains(evento.target)) {
        definirMenuLateral(false);
      }
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') {
        definirMenuLateral(false);
      }
    });
  }

  document.querySelectorAll('[data-abas]').forEach(function (grupoDeAbas) {
    var gatilhos = grupoDeAbas.querySelectorAll('[data-aba]');

    gatilhos.forEach(function (gatilho) {
      gatilho.addEventListener('click', function () {
        var abaAlvo = gatilho.getAttribute('data-aba');

        gatilhos.forEach(function (outroGatilho) {
          outroGatilho.classList.remove('ativo');
        });
        gatilho.classList.add('ativo');

        grupoDeAbas.querySelectorAll('[data-painel]').forEach(function (painel) {
          painel.hidden = painel.getAttribute('data-painel') !== abaAlvo;
        });
      });
    });
  });
});
