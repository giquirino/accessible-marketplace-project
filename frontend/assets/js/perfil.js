(function () {
  var LADO = 256;
  var QUALIDADE = 0.82;
  var TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp'];
  var TAMANHO_MAXIMO_ORIGINAL = 8 * 1024 * 1024;

  function iniciaisDe(nome) {
    return (nome || '').trim().split(/\s+/).map(function (parte) { return parte[0] || ''; }).join('').substring(0, 2).toUpperCase();
  }

  function pintarAvatares(usuario) {
    if (!usuario) return;
    var iniciais = iniciaisDe(usuario.nome);
    document.querySelectorAll('[data-avatar-usuario]').forEach(function (avatar) {
      var span = avatar.querySelector('.avatar-iniciais');
      if (span) span.textContent = iniciais; else avatar.textContent = iniciais;
      if (usuario.foto_perfil) {
        avatar.style.backgroundImage = 'url("' + usuario.foto_perfil + '")';
        avatar.classList.add('tem-foto');
      } else {
        avatar.style.backgroundImage = '';
        avatar.classList.remove('tem-foto');
      }
    });
    document.querySelectorAll('.usuario-nome, .linha-foto-perfil-nome').forEach(function (alvo) { alvo.textContent = usuario.nome; });
    document.querySelectorAll('[data-remover-foto]').forEach(function (botao) { botao.hidden = !usuario.foto_perfil; });

    var titulo = document.querySelector('.titulo-pagina');
    if (titulo && titulo.textContent.indexOf('Olá') !== -1) titulo.textContent = 'Olá, ' + usuario.nome.split(' ')[0] + '!';
  }

  function guardarUsuario(usuario) {
    localStorage.setItem('usuarioAtual', JSON.stringify(usuario));
    if (usuario.tipo) localStorage.setItem('tipoUsuario', usuario.tipo);
    pintarAvatares(usuario);
  }

  function lerArquivo(arquivo) {
    return new Promise(function (resolver, rejeitar) {
      var leitor = new FileReader();
      leitor.onload = function () { resolver(leitor.result); };
      leitor.onerror = function () { rejeitar(new Error('Não foi possível ler o arquivo escolhido.')); };
      leitor.readAsDataURL(arquivo);
    });
  }

  function carregarImagem(fonte) {
    return new Promise(function (resolver, rejeitar) {
      var imagem = new Image();
      imagem.onload = function () { resolver(imagem); };
      imagem.onerror = function () { rejeitar(new Error('O arquivo escolhido não é uma imagem válida.')); };
      imagem.src = fonte;
    });
  }

  function recortarQuadrado(imagem) {
    var tela = document.createElement('canvas');
    tela.width = LADO;
    tela.height = LADO;
    var pincel = tela.getContext('2d');
    pincel.fillStyle = '#ffffff';
    pincel.fillRect(0, 0, LADO, LADO);
    var lado = Math.min(imagem.naturalWidth, imagem.naturalHeight);
    var origemX = (imagem.naturalWidth - lado) / 2;
    var origemY = (imagem.naturalHeight - lado) / 2;
    pincel.drawImage(imagem, origemX, origemY, lado, lado, 0, 0, LADO, LADO);
    return tela.toDataURL('image/jpeg', QUALIDADE);
  }

  async function enviarFoto(arquivo, campo) {
    if (TIPOS_ACEITOS.indexOf(arquivo.type) === -1) throw new Error('Escolha uma imagem PNG, JPEG ou WebP.');
    if (arquivo.size > TAMANHO_MAXIMO_ORIGINAL) throw new Error('A imagem precisa ter no máximo 8 MB.');
    var original = await lerArquivo(arquivo);
    var imagem = await carregarImagem(original);
    var reduzida = recortarQuadrado(imagem);

    var usuario = Sola.usuarioAtual();
    pintarAvatares(Object.assign({}, usuario, { foto_perfil: reduzida }));

    if (!Sola.logado()) throw new Error('Entre na sua conta para salvar a foto de perfil.');
    var atualizado = await Sola.api('/perfil/foto', { method: 'PUT', body: JSON.stringify({ foto: reduzida }) });
    guardarUsuario(atualizado);
    Sola.aviso('Foto de perfil atualizada.');
    if (campo) campo.value = '';
  }

  async function removerFoto() {
    var usuario = Sola.usuarioAtual();
    if (!usuario || !usuario.foto_perfil) return;
    await Sola.api('/perfil/foto', { method: 'DELETE' });
    guardarUsuario(Object.assign({}, usuario, { foto_perfil: null }));
    Sola.aviso('Foto de perfil removida.');
  }

  function iniciar() {
    var usuario = Sola.usuarioAtual();
    if (usuario) pintarAvatares(usuario);

    var campo = document.querySelector('[data-campo-foto]');
    if (campo) {
      document.querySelectorAll('[data-abrir-foto]').forEach(function (alvo) {
        alvo.addEventListener('click', function () { if (!campo.disabled) campo.click(); });
      });

      campo.addEventListener('change', async function () {
        var arquivo = campo.files && campo.files[0];
        if (!arquivo) return;
        campo.disabled = true;
        try {
          await enviarFoto(arquivo, campo);
        } catch (erro) {
          pintarAvatares(Sola.usuarioAtual());
          campo.value = '';
          Sola.erro(erro.message);
        } finally {
          campo.disabled = false;
        }
      });
    }

    document.querySelectorAll('[data-remover-foto]').forEach(function (botao) {
      botao.addEventListener('click', async function () {
        botao.disabled = true;
        try { await removerFoto(); } catch (erro) { Sola.erro(erro.message); } finally { botao.disabled = false; }
      });
    });

    if (Sola.logado()) {
      Sola.api('/perfil').then(guardarUsuario).catch(function () {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
