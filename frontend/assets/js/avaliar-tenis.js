document.addEventListener('DOMContentLoaded', function () {
  var grupo = document.querySelector('[data-estrelas]');
  if (!grupo) return;

  var estrelas = Array.prototype.slice.call(grupo.querySelectorAll('.estrela-nota'));
  var erroNota = document.querySelector('[data-erro-nota]');
  var notaAtual = 0;
  var CHEIA = '../../assets/icons/icone-estrela-field.png';
  var VAZIA = '../../assets/icons/icone-estrela-outLine.png';

  function pintar(nota) {
    estrelas.forEach(function (estrela) {
      var valor = Number(estrela.dataset.valorEstrela);
      var preenchida = valor <= nota;
      estrela.querySelector('img').src = preenchida ? CHEIA : VAZIA;
      estrela.setAttribute('aria-checked', valor === nota ? 'true' : 'false');
      estrela.tabIndex = valor === (nota || 1) ? 0 : -1;
    });
  }

  function selecionar(valor) {
    notaAtual = valor;
    pintar(notaAtual);
    if (erroNota) erroNota.hidden = true;
  }

  estrelas.forEach(function (estrela, indice) {
    estrela.addEventListener('click', function () {
      selecionar(Number(estrela.dataset.valorEstrela));
    });
    estrela.addEventListener('mouseenter', function () {
      pintar(Number(estrela.dataset.valorEstrela));
    });
    estrela.addEventListener('keydown', function (evento) {
      var proximo = null;
      if (evento.key === 'ArrowRight' || evento.key === 'ArrowUp') proximo = estrelas[Math.min(indice + 1, estrelas.length - 1)];
      else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowDown') proximo = estrelas[Math.max(indice - 1, 0)];
      else if (evento.key === ' ' || evento.key === 'Enter') { evento.preventDefault(); selecionar(Number(estrela.dataset.valorEstrela)); return; }
      if (proximo) {
        evento.preventDefault();
        proximo.focus();
        selecionar(Number(proximo.dataset.valorEstrela));
      }
    });
  });

  grupo.addEventListener('mouseleave', function () { pintar(notaAtual); });
  pintar(notaAtual);

  var botaoEnviar = document.querySelector('[data-enviar-avaliacao]');
  if (botaoEnviar) {
    botaoEnviar.addEventListener('click', function () {
      if (notaAtual < 1) {
        if (erroNota) erroNota.hidden = false;
        estrelas[0].focus();
        return;
      }
      if (erroNota) erroNota.hidden = true;
      Sola.aviso('Avaliação enviada com sucesso.');
    });
  }
});
