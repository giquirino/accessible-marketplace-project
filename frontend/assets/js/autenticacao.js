(function () {

  function entrarComo(tipo, dados, token) {
    localStorage.setItem('usuarioAtual', JSON.stringify(dados));
    localStorage.setItem('tipoUsuario', tipo);
    if (token) localStorage.setItem('token', token);
    window.location.href = Sola.url(Sola.inicioPorTipo[tipo] || Sola.inicioPorTipo.cliente);
  }

  window.sair = function () {
    Sola.limparSessao();
    window.location.href = Sola.url('index.html');
  };

  document.addEventListener('DOMContentLoaded', function () {
    var formLogin = document.getElementById('form-login');
    if (formLogin) {
      var pendente = sessionStorage.getItem('solaMensagemLogin');
      if (pendente) { Sola.erroForm(formLogin, pendente); sessionStorage.removeItem('solaMensagemLogin'); }

      formLogin.addEventListener('submit', async function (e) {
        e.preventDefault();
        Sola.limparForm(formLogin);
        var campoEmail = document.getElementById('login-email');
        var campoSenha = document.getElementById('login-senha');
        if (!campoEmail.value || !campoSenha.value) {
          Sola.erroForm(formLogin, 'Preencha o e-mail e a senha para entrar.', campoEmail.value ? campoSenha : campoEmail);
          return;
        }
        var botao = formLogin.querySelector('button[type="submit"], button:not([type])');
        if (botao) botao.disabled = true;
        try {
          var resultado = await Sola.api('/auth/login', { method: 'POST', body: JSON.stringify({ email: campoEmail.value, senha: campoSenha.value }) });
          entrarComo(resultado.usuario.tipo, resultado.usuario, resultado.token);
        } catch (erro) {
          Sola.erroForm(formLogin, erro.message, campoEmail);
        } finally {
          if (botao) botao.disabled = false;
        }
      });
    }

    var formCadastro = document.getElementById('form-cadastro');
    if (formCadastro) {
      formCadastro.addEventListener('submit', async function (e) {
        e.preventDefault();
        Sola.limparForm(formCadastro);
        var campoNome = document.getElementById('cadastro-nome');
        var campoEmail = document.getElementById('cadastro-email');
        var campoSenha = document.getElementById('cadastro-senha');
        var campoConfirmar = document.getElementById('cadastro-confirmar');
        var campoTermos = document.getElementById('cadastro-termos');

        if (!campoNome.value || !campoEmail.value || !campoSenha.value || !campoConfirmar.value) {
          Sola.erroForm(formCadastro, 'Preencha todos os campos para criar a conta.', campoNome);
          return;
        }
        if (campoSenha.value.length < 8) {
          Sola.erroForm(formCadastro, 'A senha precisa ter pelo menos 8 caracteres.', campoSenha);
          return;
        }
        if (campoSenha.value !== campoConfirmar.value) {
          Sola.erroForm(formCadastro, 'As senhas não coincidem. Digite a mesma senha nos dois campos.', campoConfirmar);
          return;
        }
        if (!campoTermos.checked) {
          Sola.erroForm(formCadastro, 'Aceite os Termos de Uso para criar a conta.', campoTermos);
          return;
        }
        var botao = formCadastro.querySelector('button[type="submit"], button:not([type])');
        if (botao) botao.disabled = true;
        try {
          var resultado = await Sola.api('/auth/cadastro', { method: 'POST', body: JSON.stringify({ nome: campoNome.value, email: campoEmail.value, senha: campoSenha.value, tipo: 'cliente' }) });
          entrarComo(resultado.usuario.tipo, resultado.usuario, resultado.token);
        } catch (erro) {
          Sola.erroForm(formCadastro, erro.message, campoEmail);
        } finally {
          if (botao) botao.disabled = false;
        }
      });
    }
  });
})();
