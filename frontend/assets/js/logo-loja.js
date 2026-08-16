(function () {
  var LADO = 512;
  var QUALIDADE = 0.85;
  var TIPOS_ACEITOS = ['image/png', 'image/jpeg', 'image/webp'];
  var TAMANHO_MAXIMO_ORIGINAL = 8 * 1024 * 1024;
  var TEXTO_PADRAO = 'Arraste uma imagem ou clique para enviar (PNG, 512×512px)';

  var campo = document.querySelector('[data-campo-logo]');

  if (!campo) {
    return;
  }

  var area = document.querySelector('[data-solta-logo]');
  var previa = document.querySelector('[data-previa-logo]');
  var icone = document.querySelector('[data-icone-logo]');
  var texto = document.querySelector('[data-texto-logo]');
  var botaoRemover = document.querySelector('[data-remover-logo]');

  function mostrar(logo) {
    var temLogo = Boolean(logo);

    if (previa) {
      previa.src = logo || '';
      previa.hidden = !temLogo;
    }

    if (icone) {
      icone.hidden = temLogo;
    }

    if (texto) {
      if (temLogo) {
        texto.textContent = 'Clique ou arraste para trocar a logo';
      } else {
        texto.textContent = TEXTO_PADRAO;
      }
    }

    if (botaoRemover) {
      botaoRemover.hidden = !temLogo;
    }
  }

  async function enviar(arquivo) {
    if (TIPOS_ACEITOS.indexOf(arquivo.type) === -1) {
      throw new Error('Escolha uma imagem PNG, JPEG ou WebP.');
    }

    if (arquivo.size > TAMANHO_MAXIMO_ORIGINAL) {
      throw new Error('A imagem precisa ter no máximo 8 MB.');
    }

    if (!Sola.logado()) {
      throw new Error('Entre na sua conta para salvar a logo da loja.');
    }

    var original = await Sola.lerArquivoComoDataUrl(arquivo);
    var imagem = await Sola.carregarImagem(original);
    var reduzida = Sola.recortarQuadrado(imagem, LADO, QUALIDADE);

    mostrar(reduzida);

    var loja = await Sola.api('/lojas/logo', {
      method: 'PUT',
      body: JSON.stringify({ logo: reduzida })
    });

    mostrar(loja.logo);
    Sola.aviso('Logo da loja atualizada.');
  }

  async function processar(arquivo) {
    if (!arquivo) {
      return;
    }

    campo.disabled = true;

    try {
      await enviar(arquivo);
    } catch (erro) {
      await carregarLogoAtual();
      Sola.erro(erro.message);
    } finally {
      campo.disabled = false;
      campo.value = '';
    }
  }

  async function carregarLogoAtual() {
    if (!Sola.logado()) {
      mostrar(null);
      return;
    }

    try {
      var loja = await Sola.api('/lojas/minha');
      mostrar(loja.logo);
    } catch (erro) {
      mostrar(null);
    }
  }

  campo.addEventListener('change', function () {
    processar(campo.files && campo.files[0]);
  });

  if (area) {
    area.addEventListener('click', function () {
      if (!campo.disabled) {
        campo.click();
      }
    });

    ['dragenter', 'dragover'].forEach(function (evento) {
      area.addEventListener(evento, function (e) {
        e.preventDefault();
        area.classList.add('caixa-envio-ativa');
      });
    });

    ['dragleave', 'drop'].forEach(function (evento) {
      area.addEventListener(evento, function (e) {
        e.preventDefault();
        area.classList.remove('caixa-envio-ativa');
      });
    });

    area.addEventListener('drop', function (e) {
      var arquivo = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      processar(arquivo);
    });
  }

  if (botaoRemover) {
    botaoRemover.addEventListener('click', async function () {
      botaoRemover.disabled = true;

      try {
        await Sola.api('/lojas/logo', { method: 'DELETE' });
        mostrar(null);
        Sola.aviso('Logo da loja removida.');
      } catch (erro) {
        Sola.erro(erro.message);
      } finally {
        botaoRemover.disabled = false;
      }
    });
  }

  carregarLogoAtual();
})();
