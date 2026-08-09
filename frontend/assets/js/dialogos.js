
Sola.fecharDialogo = function (dlg) {
  if (!dlg || !dlg.open) return;
  dlg.classList.add('fechando');
  var encerrar = function () {
    dlg.classList.remove('fechando');
    dlg.close();
  };
  if (Sola.prefereMenosMovimento()) { encerrar(); return; }
  setTimeout(encerrar, 180);
};

document.addEventListener('DOMContentLoaded', function () {

  document.querySelectorAll('[data-abrir]').forEach(function (gatilho) {
    gatilho.addEventListener('click', function (e) {
      e.preventDefault();
      var dlg = document.getElementById(gatilho.getAttribute('data-abrir'));
      if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
    });
  });

  document.querySelectorAll('.dialogo').forEach(function (dlg) {
    dlg.querySelectorAll('[data-fechar]').forEach(function (botao) {
      botao.addEventListener('click', function (e) { e.preventDefault(); Sola.fecharDialogo(dlg); });
    });

    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) Sola.fecharDialogo(dlg);
    });
  });

  document.querySelectorAll('[data-form-dialogo]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var dlg = form.closest('dialog');
      if (dlg) Sola.fecharDialogo(dlg);
      Sola.aviso(form.getAttribute('data-aviso') || 'Alterações salvas');
    });
  });

  var ultimaExclusao = null;
  document.querySelectorAll('[data-abrir="dialogo-excluir"]').forEach(function (botao) {
    botao.addEventListener('click', function () { ultimaExclusao = botao; });
  });
  document.querySelectorAll('[data-confirmar-exclusao]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      var dlg = botao.closest('dialog');
      if (dlg) Sola.fecharDialogo(dlg);
      if (ultimaExclusao) {
        var alvo = ultimaExclusao.closest(botao.getAttribute('data-confirmar-exclusao'));
        if (alvo) alvo.remove();
        ultimaExclusao = null;
      }
      Sola.aviso(botao.getAttribute('data-aviso') || 'Item excluído');
    });
  });
});
