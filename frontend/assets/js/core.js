window.Sola = window.Sola || {};

Sola.API_PUBLICA = '';

Sola.raiz = (function () {
  var script = document.currentScript || document.querySelector('script[src*="assets/js/core.js"]');

  if (!script) {
    return '';
  }

  return script.src.replace(/assets\/js\/core\.js.*$/, '');
})();

Sola.inicioPorTipo = {
  admin: 'pages/admin/admin-dashboard.html',
  vendedor: 'pages/vendedor/vendedor-dashboard.html',
  cliente: 'pages/cliente/cliente-dashboard.html'
};

Sola.apiUrl = (function () {
  if (window.SOLA_API_URL) {
    return window.SOLA_API_URL;
  }

  var estaLocal = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  if (estaLocal) {
    return 'http://127.0.0.1:3000/api';
  }

  return Sola.API_PUBLICA;
})();

Sola.url = function (caminho) {
  return Sola.raiz + caminho;
};

Sola.prefereMenosMovimento = function () {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

Sola.dinheiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

Sola.formatarPreco = function (valor) {
  return Sola.dinheiro.format(Number(valor) || 0);
};

Sola.api = async function (caminho, opcoes) {
  if (!Sola.apiUrl) {
    throw new Error('Esta versão do site está publicada sem API. As ações de conta e carrinho só funcionam rodando o backend localmente.');
  }

  if (location.protocol === 'https:' && Sola.apiUrl.startsWith('http://')) {
    throw new Error('A API precisa estar em HTTPS para ser usada nesta página.');
  }

  var configuracao = opcoes || {};
  var cabecalhos = Object.assign({ 'Content-Type': 'application/json' }, configuracao.headers || {});
  var token = localStorage.getItem('token');

  if (token) {
    cabecalhos.Authorization = 'Bearer ' + token;
  }

  var resposta;

  try {
    resposta = await fetch(Sola.apiUrl + caminho, Object.assign({}, configuracao, { headers: cabecalhos }));
  } catch (erro) {
    throw new Error('Não foi possível conectar à API. Confirme se o backend está em execução na porta 3000.');
  }

  var dados = null;

  if (resposta.status !== 204) {
    dados = await resposta.json().catch(function () { return {}; });
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && token) {
      Sola.limparSessao();
    }

    throw new Error((dados && dados.erro) || 'Não foi possível concluir a solicitação.');
  }

  return dados;
};

Sola.limparSessao = function () {
  localStorage.removeItem('usuarioAtual');
  localStorage.removeItem('tipoUsuario');
  localStorage.removeItem('token');
};

Sola.logado = function () {
  return !!localStorage.getItem('token');
};

Sola.usuarioAtual = function () {
  try {
    return JSON.parse(localStorage.getItem('usuarioAtual') || 'null');
  } catch (erro) {
    return null;
  }
};

Sola.aviso = function (mensagem, tipo) {
  var pilha = document.getElementById('sola-avisos');

  if (!pilha) {
    pilha = document.createElement('div');
    pilha.id = 'sola-avisos';
    document.body.appendChild(pilha);
  }

  var ehErro = tipo === 'erro';
  var aviso = document.createElement('div');
  var classeAviso = 'aviso';
  var papel = 'status';
  var vivacidade = 'polite';
  var tempoNaTela = 3000;

  if (ehErro) {
    classeAviso = 'aviso aviso-erro';
    papel = 'alert';
    vivacidade = 'assertive';
    tempoNaTela = 6000;
  }

  aviso.className = classeAviso;
  aviso.setAttribute('role', papel);
  aviso.setAttribute('aria-live', vivacidade);
  aviso.textContent = mensagem;
  pilha.appendChild(aviso);

  setTimeout(function () {
    aviso.classList.add('saindo');
    setTimeout(function () {
      aviso.remove();
    }, 320);
  }, tempoNaTela);
};

Sola.erro = function (mensagem) {
  Sola.aviso(mensagem, 'erro');
};

Sola.erroForm = function (form, mensagem, campo) {
  if (!form) {
    Sola.erro(mensagem);
    return;
  }

  var caixa = form.querySelector('[data-erro-form]');

  if (!caixa) {
    caixa = document.createElement('p');
    caixa.className = 'erro-form';
    caixa.setAttribute('data-erro-form', '');
    caixa.setAttribute('role', 'alert');
    caixa.setAttribute('aria-live', 'assertive');
    form.insertBefore(caixa, form.firstChild);
  }

  caixa.textContent = mensagem;
  caixa.hidden = false;

  if (campo) {
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
};

Sola.limparForm = function (form) {
  if (!form) {
    return;
  }

  var caixa = form.querySelector('[data-erro-form]');

  if (caixa) {
    caixa.hidden = true;
    caixa.textContent = '';
  }

  form.querySelectorAll('[aria-invalid="true"]').forEach(function (campo) {
    campo.removeAttribute('aria-invalid');
  });
};

Sola.lerArquivoComoDataUrl = function (arquivo) {
  return new Promise(function (resolver, rejeitar) {
    var leitor = new FileReader();

    leitor.onload = function () {
      resolver(leitor.result);
    };

    leitor.onerror = function () {
      rejeitar(new Error('Não foi possível ler o arquivo escolhido.'));
    };

    leitor.readAsDataURL(arquivo);
  });
};

Sola.carregarImagem = function (fonte) {
  return new Promise(function (resolver, rejeitar) {
    var imagem = new Image();

    imagem.onload = function () {
      resolver(imagem);
    };

    imagem.onerror = function () {
      rejeitar(new Error('O arquivo escolhido não é uma imagem válida.'));
    };

    imagem.src = fonte;
  });
};

Sola.recortarQuadrado = function (imagem, lado, qualidade) {
  var tela = document.createElement('canvas');
  tela.width = lado;
  tela.height = lado;

  var pincel = tela.getContext('2d');
  pincel.fillStyle = '#ffffff';
  pincel.fillRect(0, 0, lado, lado);

  var ladoRecorte = Math.min(imagem.naturalWidth, imagem.naturalHeight);
  var origemX = (imagem.naturalWidth - ladoRecorte) / 2;
  var origemY = (imagem.naturalHeight - ladoRecorte) / 2;

  pincel.drawImage(imagem, origemX, origemY, ladoRecorte, ladoRecorte, 0, 0, lado, lado);

  return tela.toDataURL('image/jpeg', qualidade);
};

Sola.carregarScript = function (arquivo, pronto) {
  var script = document.createElement('script');
  script.src = Sola.url(arquivo);
  script.onload = pronto || function () {};
  script.onerror = function () {
    console.warn('Não foi possível carregar', arquivo);
  };
  document.head.appendChild(script);
};

Sola.carregarScript('assets/js/guarda.js');
Sola.carregarScript('assets/js/perfil.js');
Sola.carregarScript('assets/js/vlibras-widget.js');

(function carregarCSSAcessibilidade() {
  var href = Sola.url('assets/css/accessibility-menu.css');
  var jaExiste = document.querySelector('link[data-sola-accessibility-css]');

  if (!jaExiste) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-sola-accessibility-css', '');
    document.head.appendChild(link);
  }
})();

Sola.carregarScript('assets/js/AccessibilityMenu.js');
