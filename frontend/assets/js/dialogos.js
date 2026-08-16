Sola.fecharDialogo = function (dialogo) {
  if (!dialogo || !dialogo.open) {
    return;
  }

  dialogo.classList.add('fechando');

  var encerrar = function () {
    dialogo.classList.remove('fechando');
    dialogo.close();
  };

  if (Sola.prefereMenosMovimento()) {
    encerrar();
    return;
  }

  setTimeout(encerrar, 180);
};

document.addEventListener('DOMContentLoaded', function () {

  document.querySelectorAll('[data-abrir]').forEach(function (gatilho) {
    gatilho.addEventListener('click', function (evento) {
      evento.preventDefault();
      var dialogo = document.getElementById(gatilho.getAttribute('data-abrir'));

      if (dialogo && typeof dialogo.showModal === 'function') {
        dialogo.showModal();
      }
    });
  });

  document.querySelectorAll('.dialogo').forEach(function (dialogo) {
    dialogo.querySelectorAll('[data-fechar]').forEach(function (botao) {
      botao.addEventListener('click', function (evento) {
        evento.preventDefault();
        Sola.fecharDialogo(dialogo);
      });
    });

    dialogo.addEventListener('click', function (evento) {
      if (evento.target === dialogo) {
        Sola.fecharDialogo(dialogo);
      }
    });
  });

  document.querySelectorAll('[data-form-dialogo]').forEach(function (formulario) {
    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      var dialogo = formulario.closest('dialog');

      if (dialogo) {
        Sola.fecharDialogo(dialogo);
      }

      Sola.aviso(formulario.getAttribute('data-aviso') || 'Alterações salvas');
    });
  });

  var botaoDaUltimaExclusao = null;

  document.querySelectorAll('[data-abrir="dialogo-excluir"]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      botaoDaUltimaExclusao = botao;
    });
  });

  document.querySelectorAll('[data-confirmar-exclusao]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      var dialogo = botao.closest('dialog');

      if (dialogo) {
        Sola.fecharDialogo(dialogo);
      }

      if (botaoDaUltimaExclusao) {
        var itemParaExcluir = botaoDaUltimaExclusao.closest(botao.getAttribute('data-confirmar-exclusao'));

        if (itemParaExcluir) {
          itemParaExcluir.remove();
        }

        botaoDaUltimaExclusao = null;
      }

      Sola.aviso(botao.getAttribute('data-aviso') || 'Item excluído');
    });
  });
});
