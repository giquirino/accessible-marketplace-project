
window.Sola = window.Sola || {};

Sola.raiz = (function () {
  var s = document.currentScript ||
          document.querySelector('script[src*="assets/js/core.js"]');
  return s ? s.src.replace(/assets\/js\/core\.js.*$/, '') : '';
})();

Sola.inicioPorTipo = {
  admin: 'pages/admin/admin-dashboard.html',
  vendedor: 'pages/vendedor/vendedor-dashboard.html',
  cliente: 'pages/cliente/cliente-dashboard.html'
};

Sola.url = function (caminho) {
  return Sola.raiz + caminho;
};

Sola.prefereMenosMovimento = function () {
  return window.matchMedia &&
         window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

Sola.aviso = function (mensagem) {
  var pilha = document.getElementById('sola-avisos');
  if (!pilha) {
    pilha = document.createElement('div');
    pilha.id = 'sola-avisos';
    document.body.appendChild(pilha);
  }
  var aviso = document.createElement('div');
  aviso.className = 'aviso';
  aviso.setAttribute('role', 'status');
  aviso.textContent = mensagem;
  pilha.appendChild(aviso);
  setTimeout(function () {
    aviso.classList.add('saindo');
    setTimeout(function () { aviso.remove(); }, 320);
  }, 3000);
};
