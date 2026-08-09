document.addEventListener('DOMContentLoaded', function () {

  document.body.classList.add('pronta');

  var alvos = document.querySelectorAll(
    '.cartao-numero, .produto, .avaliacao, .cartao-form, .quadro-tabela,' +
    '.cartao-grafico, .categoria, .vantagem, #resumo-pedido, .cartao-endereco,' +
    '.opcao-pagamento, .foto-destaque, .foto-larga'
  );
  if (!alvos.length) return;

  if (Sola.prefereMenosMovimento() || !('IntersectionObserver' in window)) {
    alvos.forEach(function (el) { el.classList.add('visivel'); });
    return;
  }

  alvos.forEach(function (el) { el.classList.add('js-revelar'); });

  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (!entrada.isIntersecting) return;
      var el = entrada.target;
      var irmaos = Array.prototype.slice.call(el.parentNode.children);
      var passo = Math.min(irmaos.indexOf(el), 5);
      el.style.transitionDelay = (passo * 60) + 'ms';
      el.classList.add('visivel');
      observador.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  alvos.forEach(function (el) { observador.observe(el); });
});
