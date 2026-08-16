document.addEventListener('DOMContentLoaded', function () {

  document.body.classList.add('pronta');

  var alvos = document.querySelectorAll(
    '.cartao-numero, .produto, .avaliacao, .cartao-form, .quadro-tabela,' +
    '.cartao-grafico, .categoria, .vantagem, #resumo-pedido, .cartao-endereco,' +
    '.opcao-pagamento, .foto-destaque, .foto-larga'
  );

  if (!alvos.length) {
    return;
  }

  var semAnimacao = Sola.prefereMenosMovimento() || !('IntersectionObserver' in window);

  if (semAnimacao) {
    alvos.forEach(function (elemento) {
      elemento.classList.add('visivel');
    });
    return;
  }

  alvos.forEach(function (elemento) {
    elemento.classList.add('js-revelar');
  });

  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (!entrada.isIntersecting) {
        return;
      }

      var elemento = entrada.target;
      var elementosIrmaos = Array.prototype.slice.call(elemento.parentNode.children);
      var atraso = Math.min(elementosIrmaos.indexOf(elemento), 5);

      elemento.style.transitionDelay = (atraso * 60) + 'ms';
      elemento.classList.add('visivel');
      observador.unobserve(elemento);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  alvos.forEach(function (elemento) {
    observador.observe(elemento);
  });
});
