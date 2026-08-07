
(function () {

  function tipoDeUsuarioPeloEmail(email) {
    var e = email.toLowerCase();
    if (e.indexOf('@admin') !== -1) return 'admin';
    if (e.indexOf('@vendedor') !== -1) return 'vendedor';
    return 'cliente';
  }

  function entrarComo(tipo, dados) {
    localStorage.setItem('usuarioAtual', JSON.stringify(dados));
    localStorage.setItem('tipoUsuario', tipo);
    window.location.href = Sola.url(Sola.inicioPorTipo[tipo] || Sola.inicioPorTipo.cliente);
  }

  window.sair = function () {
    localStorage.removeItem('usuarioAtual');
    localStorage.removeItem('tipoUsuario');
    window.location.href = Sola.url('index.html');
  };

  document.addEventListener('DOMContentLoaded', function () {
    var formLogin = document.getElementById('form-login');
    if (formLogin) {
      formLogin.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = document.getElementById('login-email').value;
        var senha = document.getElementById('login-senha').value;
        if (!email || !senha) {
          alert('Preencha o e-mail e a senha para entrar.');
          return;
        }
        var tipo = tipoDeUsuarioPeloEmail(email);
        entrarComo(tipo, { email: email, tipo: tipo, dataLogin: new Date().toISOString() });
      });
    }

    var formCadastro = document.getElementById('form-cadastro');
    if (formCadastro) {
      formCadastro.addEventListener('submit', function (e) {
        e.preventDefault();
        var nome = document.getElementById('cadastro-nome').value;
        var email = document.getElementById('cadastro-email').value;
        var senha = document.getElementById('cadastro-senha').value;
        var confirmar = document.getElementById('cadastro-confirmar').value;
        var termos = document.getElementById('cadastro-termos').checked;

        if (!nome || !email || !senha || !confirmar) {
          alert('Preencha todos os campos para criar a conta.');
          return;
        }
        if (senha !== confirmar) {
          alert('As senhas não coincidem. Digite a mesma senha nos dois campos.');
          return;
        }
        if (!termos) {
          alert('Aceite os Termos de Uso para criar a conta.');
          return;
        }
        var tipo = tipoDeUsuarioPeloEmail(email);
        entrarComo(tipo, { nome: nome, email: email, tipo: tipo, dataCadastro: new Date().toISOString() });
      });
    }

    var bruto = localStorage.getItem('usuarioAtual');
    var tipoLogado = localStorage.getItem('tipoUsuario');
    if (!bruto || !tipoLogado) return;

    var usuario = JSON.parse(bruto);
    if (!usuario.nome) return;

    var iniciais = usuario.nome.split(' ').map(function (p) { return p[0]; })
                       .join('').substring(0, 2).toUpperCase();

    var nomeNoMenu = document.querySelector('.usuario-nome');
    if (nomeNoMenu) nomeNoMenu.textContent = usuario.nome;

    function pintarIniciais(avatar) {
      if (!avatar) return;
      var span = avatar.querySelector('.avatar-iniciais');
      if (span) span.textContent = iniciais; else avatar.textContent = iniciais;
    }
    pintarIniciais(document.querySelector('.usuario .avatar'));
    pintarIniciais(document.querySelector('.topo-acoes .avatar'));

    var titulo = document.querySelector('.titulo-pagina');
    if (titulo && titulo.textContent.indexOf('Olá') !== -1) {
      titulo.textContent = 'Olá, ' + usuario.nome.split(' ')[0] + '!';
    }
  });
})();
