(function () {

  var PERFIL_POR_PASTA = {
    '/pages/admin/': 'admin',
    '/pages/vendedor/': 'vendedor',
    '/pages/cliente/': 'cliente'
  };

  function perfilExigido() {
    var caminhoDaPagina = location.pathname.replace(/\\/g, '/');
    var pastaEncontrada = Object.keys(PERFIL_POR_PASTA).find(function (nomeDaPasta) {
      return caminhoDaPagina.indexOf(nomeDaPasta) !== -1;
    });

    if (!pastaEncontrada) {
      return null;
    }

    return PERFIL_POR_PASTA[pastaEncontrada];
  }

  function tokenExpirado(token) {
    try {
      var parteCentralDoToken = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      var dadosDoToken = JSON.parse(atob(parteCentralDoToken));
      return typeof dadosDoToken.exp === 'number' && dadosDoToken.exp * 1000 <= Date.now();
    } catch (erro) {
      return true;
    }
  }

  function irPara(caminho) {
    location.replace(Sola.url(caminho));
  }

  var token = localStorage.getItem('token');
  var tipoDeUsuario = localStorage.getItem('tipoUsuario');
  var perfilNecessario = perfilExigido();

  if (token && tokenExpirado(token)) {
    Sola.limparSessao();
    token = null;
    tipoDeUsuario = null;

    if (perfilNecessario) {
      sessionStorage.setItem('solaMensagemLogin', 'Sua sessão expirou. Entre novamente para continuar.');
      irPara('pages/publico/login.html');
      return;
    }
  }

  if (perfilNecessario) {
    if (!token || !tipoDeUsuario) {
      sessionStorage.setItem('solaMensagemLogin', 'Entre na sua conta para acessar esta página.');
      irPara('pages/publico/login.html');
      return;
    }

    if (tipoDeUsuario !== perfilNecessario) {
      irPara(Sola.inicioPorTipo[tipoDeUsuario] || Sola.inicioPorTipo.cliente);
      return;
    }
  }

  var estaNaTelaDeLoginOuCadastro = /\/publico\/(login|cadastro)\.html$/.test(location.pathname);

  if (token && tipoDeUsuario && estaNaTelaDeLoginOuCadastro) {
    irPara(Sola.inicioPorTipo[tipoDeUsuario] || Sola.inicioPorTipo.cliente);
  }
})();
