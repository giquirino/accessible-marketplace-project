(function () {
  var PERFIL_POR_PASTA = { '/pages/admin/': 'admin', '/pages/vendedor/': 'vendedor', '/pages/cliente/': 'cliente' };

  function perfilExigido() {
    var caminho = location.pathname.replace(/\\/g, '/');
    var pasta = Object.keys(PERFIL_POR_PASTA).find(function (chave) { return caminho.indexOf(chave) !== -1; });
    return pasta ? PERFIL_POR_PASTA[pasta] : null;
  }

  function tokenExpirado(token) {
    try {
      var carga = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof carga.exp === 'number' && carga.exp * 1000 <= Date.now();
    } catch { return true; }
  }

  function irPara(caminho) { location.replace(Sola.url(caminho)); }

  var token = localStorage.getItem('token');
  var tipo = localStorage.getItem('tipoUsuario');
  var exigido = perfilExigido();

  if (token && tokenExpirado(token)) {
    Sola.limparSessao();
    token = null;
    tipo = null;
    if (exigido) { sessionStorage.setItem('solaMensagemLogin', 'Sua sessão expirou. Entre novamente para continuar.'); irPara('pages/publico/login.html'); return; }
  }

  if (exigido) {
    if (!token || !tipo) {
      sessionStorage.setItem('solaMensagemLogin', 'Entre na sua conta para acessar esta página.');
      irPara('pages/publico/login.html');
      return;
    }
    if (tipo !== exigido) {
      irPara(Sola.inicioPorTipo[tipo] || Sola.inicioPorTipo.cliente);
      return;
    }
  }

  if (token && tipo && /\/publico\/(login|cadastro)\.html$/.test(location.pathname)) {
    irPara(Sola.inicioPorTipo[tipo] || Sola.inicioPorTipo.cliente);
  }
})();
