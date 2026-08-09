
document.addEventListener('DOMContentLoaded', function () {

  var menuLateral = document.getElementById('menu-lateral');
  var botoesMenu = document.querySelectorAll('[data-abrir-menu]');

  if (menuLateral && botoesMenu.length) {

    var definirMenuLateral = function (aberto) {
      menuLateral.classList.toggle('aberto', aberto);
      botoesMenu.forEach(function (botao) {
        botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
        botao.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
      });
    };

    botoesMenu.forEach(function (botao) {
      botao.addEventListener('click', function (e) {
        e.stopPropagation();
        definirMenuLateral(!menuLateral.classList.contains('aberto'));
      });
    });

    document.addEventListener('click', function (e) {
      if (!menuLateral.classList.contains('aberto')) return;
      if (!menuLateral.contains(e.target)) definirMenuLateral(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') definirMenuLateral(false);
    });
  }

  document.querySelectorAll('[data-abas]').forEach(function (grupo) {
    var gatilhos = grupo.querySelectorAll('[data-aba]');
    gatilhos.forEach(function (gatilho) {
      gatilho.addEventListener('click', function () {
        var alvo = gatilho.getAttribute('data-aba');
        gatilhos.forEach(function (g) { g.classList.remove('ativo'); });
        gatilho.classList.add('ativo');
        grupo.querySelectorAll('[data-painel]').forEach(function (painel) {
          painel.hidden = painel.getAttribute('data-painel') !== alvo;
        });
      });
    });
  });
});
