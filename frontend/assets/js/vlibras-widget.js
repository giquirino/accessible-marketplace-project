(function () {

  if (window.__solaVlibrasInicializado) {
    return;
  }
  window.__solaVlibrasInicializado = true;

  function montarWidget() {
    if (document.querySelector('[vw]')) {
      return;
    }

    var container = document.createElement('div');
    container.setAttribute('vw', '');
    container.className = 'enabled';
    container.innerHTML = '<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
    document.body.appendChild(container);

    var script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.async = true;
    script.onload = function () {
      if (window.VLibras && window.VLibras.Widget) {
        new window.VLibras.Widget('https://vlibras.gov.br/app');
      }
    };
    script.onerror = function () {
      console.error('Não foi possível carregar o VLibras Widget.');
    };
    document.head.appendChild(script);
  }

  function iniciar() {
    montarWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
