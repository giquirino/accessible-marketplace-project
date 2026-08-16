(function () {
  'use strict';

  if (window.SolaAccessibility) {
    return;
  }

  var ARMAZENAMENTO = {
    font: 'solaA11yFont',
    contrast: 'solaA11yContrast',
    colorVision: 'solaA11yColorVision',
    dyslexia: 'solaA11yDyslexia',
    focus: 'solaA11yFocus',
    clickArea: 'solaA11yClickArea',
    spacing: 'solaA11ySpacing',
    reduceMotion: 'solaA11yReduceMotion',
    readingMask: 'solaA11yReadingMask',
    darkTheme: 'solaA11yDarkTheme'
  };

  var estado = {
    font: localStorage.getItem(ARMAZENAMENTO.font) || 'normal',
    contrast: localStorage.getItem(ARMAZENAMENTO.contrast) || 'normal',
    colorVision: localStorage.getItem(ARMAZENAMENTO.colorVision) || 'normal',
    dyslexia: localStorage.getItem(ARMAZENAMENTO.dyslexia) === '1',
    focus: localStorage.getItem(ARMAZENAMENTO.focus) === '1',
    clickArea: localStorage.getItem(ARMAZENAMENTO.clickArea) === '1',
    spacing: localStorage.getItem(ARMAZENAMENTO.spacing) === '1',
    reduceMotion: localStorage.getItem(ARMAZENAMENTO.reduceMotion) === '1',
    readingMask: localStorage.getItem(ARMAZENAMENTO.readingMask) === '1',
    darkTheme: localStorage.getItem(ARMAZENAMENTO.darkTheme) === '1',
    reconhecimento: null,
    reconhecimentoAtivo: false,
    vozes: []
  };

  var ESCALA_FONTE = {
    small: 0.90,
    normal: 1,
    large: 1.10,
    larger: 1.20
  };

  var SELETORES_DE_FONTE = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'li', 'dt', 'dd', 'label', 'legend',
    'button', 'input', 'select', 'textarea',
    'a', 'th', 'td', 'caption', 'figcaption',
    'blockquote', 'small', 'strong', 'em',
    '[role="button"]', '[role="option"]', '[role="tab"]',
    '[role="menuitem"]'
  ].join(',');

  function salvar(chave, valor) {
    var chaveArmazenamento = ARMAZENAMENTO[chave];
    if (!chaveArmazenamento) {
      return;
    }

    var valorGravado = valor;
    if (valor) {
      valorGravado = '1';
    }
    localStorage.setItem(chaveArmazenamento, valorGravado);
  }

  function obterRaizConteudo() {
    return document.querySelector('main, [role="main"], #conteudo') || document.body;
  }

  function aplicarEscalaFonte() {
    var escala = ESCALA_FONTE[estado.font] || 1;
    var root = obterRaizConteudo();
    if (!root) {
      return;
    }

    root.querySelectorAll(SELETORES_DE_FONTE).forEach(function (elemento) {
      if (elemento.closest('#sola-acessibilidade')) {
        return;
      }

      var tamanhoOriginal = parseFloat(elemento.getAttribute('data-sola-a11y-font-original'));
      if (!Number.isFinite(tamanhoOriginal)) {
        var estiloComputado = window.getComputedStyle(elemento);
        tamanhoOriginal = parseFloat(estiloComputado.fontSize);
        if (!Number.isFinite(tamanhoOriginal) || tamanhoOriginal < 8 || tamanhoOriginal > 96) {
          return;
        }
        elemento.setAttribute('data-sola-a11y-font-original', String(tamanhoOriginal));
      }

      var novoTamanho;
      if (escala === 1) {
        novoTamanho = '';
      } else {
        novoTamanho = (tamanhoOriginal * escala) + 'px';
      }
      elemento.style.fontSize = novoTamanho;
    });
  }

  function limparEscalaFonteTransitoria() {
    var root = obterRaizConteudo();
    if (!root) {
      return;
    }

    root.querySelectorAll('[data-sola-a11y-font-original]').forEach(function (elemento) {
      elemento.style.fontSize = '';
    });
  }

  var ultimaFonteAplicada = null;

  function aplicar() {
    var root = document.documentElement;

    if (estado.contrast !== 'normal' && estado.colorVision !== 'normal') {
      estado.colorVision = 'normal';
      salvar('colorVision', estado.colorVision);
    }

    root.classList.remove(
      'sola-a11y-espacamento',
      'sola-a11y-foco',
      'sola-a11y-area-clique',
      'sola-a11y-dislexia',
      'sola-a11y-reduzir-estimulos',
      'sola-a11y-mascara',
      'sola-a11y-tema-escuro',
      'sola-a11y-alto-contraste',
      'sola-a11y-inverso',
      'sola-a11y-protanopia',
      'sola-a11y-deuteranopia',
      'sola-a11y-tritanopia'
    );

    if (estado.spacing) {
      root.classList.add('sola-a11y-espacamento');
    }
    if (estado.focus) {
      root.classList.add('sola-a11y-foco');
    }
    if (estado.clickArea) {
      root.classList.add('sola-a11y-area-clique');
    }
    if (estado.dyslexia) {
      root.classList.add('sola-a11y-dislexia');
    }
    if (estado.reduceMotion) {
      root.classList.add('sola-a11y-reduzir-estimulos');
    }
    if (estado.readingMask) {
      root.classList.add('sola-a11y-mascara');
    }
    if (estado.darkTheme) {
      root.classList.add('sola-a11y-tema-escuro');
    }
    if (estado.contrast === 'high') {
      root.classList.add('sola-a11y-alto-contraste');
    }
    if (estado.contrast === 'inverse') {
      root.classList.add('sola-a11y-inverso');
    }
    if (estado.colorVision !== 'normal') {
      root.classList.add('sola-a11y-' + estado.colorVision);
    }

    if (estado.font !== ultimaFonteAplicada) {
      ultimaFonteAplicada = estado.font;
      limparEscalaFonteTransitoria();
      window.requestAnimationFrame(aplicarEscalaFonte);
    }
    atualizarBotoes();
  }

  function textoBooleano(valor) {
    if (valor) {
      return 'true';
    }
    return 'false';
  }

  function atualizarBotoes() {
    var menu = document.getElementById('sola-acessibilidade');
    if (!menu) {
      return;
    }

    menu.querySelectorAll('[data-a11y-toggle]').forEach(function (botao) {
      var chave = botao.getAttribute('data-a11y-toggle');
      botao.setAttribute('aria-pressed', textoBooleano(estado[chave]));
    });

    menu.querySelectorAll('[data-a11y-value]').forEach(function (botao) {
      var par = botao.getAttribute('data-a11y-value').split(':');
      botao.setAttribute('aria-pressed', textoBooleano(estado[par[0]] === par[1]));
    });

    var botaoComando = menu.querySelector('[data-a11y-command]');
    if (botaoComando) {
      botaoComando.setAttribute('aria-pressed', textoBooleano(estado.reconhecimentoAtivo));

      var textoBotaoComando;
      if (estado.reconhecimentoAtivo) {
        textoBotaoComando = '■ Parar comando por voz';
      } else {
        textoBotaoComando = '🎙 Comando por voz';
      }
      botaoComando.textContent = textoBotaoComando;
    }
  }

  function definirEstado(chave, valor) {
    estado[chave] = valor;
    salvar(chave, valor);
    aplicar();
  }

  function alternarValorExclusivo(chave, chaveOposta, valor) {
    var proximoValor;
    if (estado[chave] === valor) {
      proximoValor = 'normal';
    } else {
      proximoValor = valor;
    }

    estado[chave] = proximoValor;
    estado[chaveOposta] = 'normal';
    salvar(chave, estado[chave]);
    salvar(chaveOposta, estado[chaveOposta]);
    aplicar();
  }

  function definirOpcao(chave, valor) {
    if (chave === 'contrast') {
      alternarValorExclusivo('contrast', 'colorVision', valor);
      return;
    }

    if (chave === 'colorVision') {
      alternarValorExclusivo('colorVision', 'contrast', valor);
      return;
    }

    definirEstado(chave, valor);
  }

  function alternar(chave) {
    definirEstado(chave, !estado[chave]);
  }

  function fecharPainel() {
    pararReconhecimento();

    var painel = document.getElementById('sola-a11y-painel');
    var gatilho = document.getElementById('sola-a11y-trigger');

    if (painel) {
      painel.hidden = true;
    }
    if (gatilho) {
      gatilho.setAttribute('aria-expanded', 'false');
      gatilho.focus();
    }
  }

  function normalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function obterTextoPagina() {
    var alvo = obterRaizConteudo();
    if (!alvo) {
      return '';
    }

    var clone = alvo.cloneNode(true);
    clone.querySelectorAll('#sola-acessibilidade, script, style, noscript, [aria-hidden="true"]').forEach(function (elemento) {
      elemento.remove();
    });

    return (clone.innerText || clone.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000);
  }

  function pararFala() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    definirStatusVoz('Leitura interrompida.');
  }

  function dividirTextoFala(texto) {
    var partes = [];

    String(texto || '').split(/(?<=[.!?])\s+/).forEach(function (parte) {
      var atual = parte.trim();
      while (atual.length > 260) {
        var corte = atual.lastIndexOf(' ', 260);
        if (corte < 80) {
          corte = 260;
        }
        partes.push(atual.slice(0, corte));
        atual = atual.slice(corte).trim();
      }
      if (atual) {
        partes.push(atual);
      }
    });

    return partes.slice(0, 60);
  }

  function escolherVoz() {
    if (!('speechSynthesis' in window)) {
      return null;
    }

    var vozes = window.speechSynthesis.getVoices() || [];
    estado.vozes = vozes;

    var vozPortuguesBrasil = vozes.find(function (voz) { return /^pt-BR$/i.test(voz.lang); });
    if (vozPortuguesBrasil) {
      return vozPortuguesBrasil;
    }

    var vozPortugues = vozes.find(function (voz) { return /^pt[-_]/i.test(voz.lang); });
    if (vozPortugues) {
      return vozPortugues;
    }

    var vozPadrao = vozes.find(function (voz) { return voz.default; });
    if (vozPadrao) {
      return vozPadrao;
    }

    return null;
  }

  function falar(texto) {
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') {
      definirStatusVoz('Seu navegador não oferece leitura de texto por voz.');
      return;
    }

    var textoLimpo = String(texto || '').trim();
    if (!textoLimpo) {
      definirStatusVoz('Não encontrei texto principal nesta página para ler.');
      return;
    }

    var sintetizador = window.speechSynthesis;
    sintetizador.cancel();

    var partes = dividirTextoFala(textoLimpo);
    var indice = 0;
    var voz = escolherVoz();

    function proxima() {
      if (indice >= partes.length) {
        definirStatusVoz('Leitura concluída.');
        return;
      }

      var utterance = new SpeechSynthesisUtterance(partes[indice++]);

      var idiomaUtterance;
      if (voz && voz.lang) {
        idiomaUtterance = voz.lang;
      } else {
        idiomaUtterance = 'pt-BR';
      }
      utterance.lang = idiomaUtterance;
      utterance.voice = voz || null;
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.onstart = function () {
        definirStatusVoz('Lendo a página… ' + indice + '/' + partes.length);
      };
      utterance.onerror = function (evento) {
        definirStatusVoz('Não foi possível continuar a leitura: ' + (evento.error || 'erro de voz') + '.');
      };
      utterance.onend = proxima;
      sintetizador.speak(utterance);
    }

    proxima();
  }

  function definirStatusVoz(mensagem) {
    var elemento = document.querySelector('[data-a11y-voice-status]');
    if (elemento) {
      elemento.textContent = mensagem;
    }
  }

  function construtorReconhecimento() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function mensagemErroReconhecimento(erro) {
    var mensagens = {
      'not-allowed': 'O navegador bloqueou o microfone. Permita o acesso ao microfone para este site e tente novamente.',
      'service-not-allowed': 'O reconhecimento de voz está bloqueado pelo navegador ou pela política da página.',
      'audio-capture': 'Nenhum microfone disponível foi encontrado.',
      'no-speech': 'Não detectei fala. Fale depois que aparecer “Escutando”.',
      'network': 'O serviço de reconhecimento de voz não respondeu. Verifique sua conexão e tente novamente.',
      'aborted': 'O comando por voz foi interrompido.',
      'language-not-supported': 'O idioma português não está disponível para o reconhecimento de voz neste navegador.'
    };

    return mensagens[erro] || 'Não foi possível iniciar o reconhecimento de voz. Tente novamente.';
  }

  function alternarEFalar(chave, mensagemLigado, mensagemDesligado) {
    alternar(chave);
    if (estado[chave]) {
      falar(mensagemLigado);
    } else {
      falar(mensagemDesligado);
    }
  }

  function alternarValorEFalar(chave, valorLigado, mensagemLigado, mensagemDesligado) {
    var proximoValor;
    if (estado[chave] === valorLigado) {
      proximoValor = 'normal';
    } else {
      proximoValor = valorLigado;
    }
    definirEstado(chave, proximoValor);

    if (estado[chave] === valorLigado) {
      falar(mensagemLigado);
    } else {
      falar(mensagemDesligado);
    }
  }

  function executarComandoVoz(transcricao) {
    var comando = normalizar(transcricao);
    definirStatusVoz('Comando recebido: “' + transcricao + '”');

    if (comando.includes('parar leitura') || comando.includes('parar voz') || comando.includes('silencio')) {
      pararFala();
      return;
    }

    if (comando.includes('ler pagina') || comando.includes('ler a pagina') || comando === 'ler' || comando.includes('leia pagina')) {
      falar(obterTextoPagina());
      return;
    }

    if (comando.includes('aumentar fonte') || comando.includes('aumente a fonte') || comando.includes('aumentar o tamanho da fonte') || comando.includes('fonte maior') || comando === 'mais fonte') {
      var proximoTamanhoMaior;
      if (estado.font === 'small') {
        proximoTamanhoMaior = 'normal';
      } else if (estado.font === 'normal') {
        proximoTamanhoMaior = 'large';
      } else {
        proximoTamanhoMaior = 'larger';
      }
      definirEstado('font', proximoTamanhoMaior);
      falar('Tamanho da fonte aumentado.');
      return;
    }

    if (comando.includes('diminuir fonte') || comando.includes('diminua a fonte') || comando.includes('diminuir o tamanho da fonte') || comando.includes('fonte menor') || comando === 'menos fonte') {
      var proximoTamanhoMenor;
      if (estado.font === 'larger') {
        proximoTamanhoMenor = 'large';
      } else if (estado.font === 'large') {
        proximoTamanhoMenor = 'normal';
      } else {
        proximoTamanhoMenor = 'small';
      }
      definirEstado('font', proximoTamanhoMenor);
      falar('Tamanho da fonte diminuído.');
      return;
    }

    if (comando.includes('fonte normal') || comando.includes('tamanho normal')) {
      definirEstado('font', 'normal');
      falar('Fonte normal ativada.');
      return;
    }

    if (comando.includes('alto contraste') || comando.includes('contraste alto')) {
      alternarValorEFalar('contrast', 'high', 'Alto contraste ativado.', 'Alto contraste desativado.');
      return;
    }

    if (comando.includes('contraste inverso') || comando.includes('inverter contraste') || comando.includes('inverter cores')) {
      alternarValorEFalar('contrast', 'inverse', 'Contraste inverso ativado.', 'Contraste inverso desativado.');
      return;
    }

    if (comando.includes('modo dislexia') || comando.includes('fonte dislexia')) {
      alternarEFalar('dyslexia', 'Modo para dislexia ativado.', 'Modo para dislexia desativado.');
      return;
    }

    if (comando.includes('espacar texto') || comando.includes('espacamento de texto')) {
      alternarEFalar('spacing', 'Espaçamento de texto ativado.', 'Espaçamento de texto desativado.');
      return;
    }

    if (comando.includes('pausar animacao') || comando.includes('parar animacoes') || comando.includes('reduzir movimento')) {
      alternarEFalar('reduceMotion', 'Animações reduzidas.', 'Animações restauradas.');
      return;
    }

    if (comando.includes('foco destacado') || comando.includes('destacar foco')) {
      alternarEFalar('focus', 'Foco destacado ativado.', 'Foco destacado desativado.');
      return;
    }

    if (comando.includes('areas de clique') || comando.includes('botoes maiores')) {
      alternarEFalar('clickArea', 'Áreas de clique ampliadas.', 'Áreas de clique normais.');
      return;
    }

    if (comando.includes('mascara de leitura') || comando.includes('modo leitura')) {
      alternarEFalar('readingMask', 'Máscara de leitura ativada.', 'Máscara de leitura desativada.');
      return;
    }

    if (comando.includes('cor normal')) {
      definirEstado('colorVision', 'normal');
      falar('Cores normais restauradas.');
      return;
    }

    if (comando.includes('protanopia')) {
      definirEstado('colorVision', 'protanopia');
      falar('Filtro para protanopia ativado.');
      return;
    }

    if (comando.includes('deuteranopia')) {
      definirEstado('colorVision', 'deuteranopia');
      falar('Filtro para deuteranopia ativado.');
      return;
    }

    if (comando.includes('tritanopia')) {
      definirEstado('colorVision', 'tritanopia');
      falar('Filtro para tritanopia ativado.');
      return;
    }

    if (comando.includes('fechar menu') || comando === 'fechar') {
      fecharPainel();
      return;
    }

    definirStatusVoz('Não reconheci esse comando. Diga, por exemplo, “ler página”, “aumentar fonte” ou “alto contraste”.');
    falar('Comando não reconhecido.');
  }

  function pararReconhecimento() {
    if (estado.reconhecimento) {
      try {
        estado.reconhecimento.onend = null;
        estado.reconhecimento.stop();
      } catch (erro) {
        estado.reconhecimento = null;
      }
      estado.reconhecimento = null;
    }

    estado.reconhecimentoAtivo = false;
    atualizarBotoes();
  }

  function iniciarReconhecimento() {
    var ClasseReconhecimento = construtorReconhecimento();
    if (!ClasseReconhecimento) {
      definirStatusVoz('Seu navegador não disponibiliza reconhecimento de voz. Para esta função, use Chrome ou Edge em uma conexão segura (HTTPS ou localhost).');
      return;
    }

    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' && location.hostname !== '[::1]') {
      definirStatusVoz('O comando por voz precisa de HTTPS ou localhost. Não funciona abrindo o HTML diretamente pelo arquivo.');
      return;
    }

    if (estado.reconhecimentoAtivo) {
      pararReconhecimento();
      definirStatusVoz('Comandos por voz interrompidos.');
      return;
    }

    var reconhecimento = new ClasseReconhecimento();
    reconhecimento.lang = 'pt-BR';
    reconhecimento.continuous = false;
    reconhecimento.interimResults = false;
    reconhecimento.maxAlternatives = 3;

    reconhecimento.onstart = function () {
      estado.reconhecimentoAtivo = true;
      estado.reconhecimento = reconhecimento;
      definirStatusVoz('Escutando… fale agora.');
      atualizarBotoes();
    };

    reconhecimento.onresult = function (evento) {
      var resultado = evento.results && evento.results[0] && evento.results[0][0];
      if (resultado && resultado.transcript) {
        executarComandoVoz(resultado.transcript);
      }
    };

    reconhecimento.onerror = function (evento) {
      estado.reconhecimentoAtivo = false;
      estado.reconhecimento = null;
      definirStatusVoz(mensagemErroReconhecimento(evento.error));
      atualizarBotoes();
    };

    reconhecimento.onend = function () {
      estado.reconhecimentoAtivo = false;
      estado.reconhecimento = null;
      atualizarBotoes();
    };

    estado.reconhecimento = reconhecimento;
    estado.reconhecimentoAtivo = true;
    atualizarBotoes();
    definirStatusVoz('Solicitando acesso ao microfone…');

    function tentarIniciar() {
      try {
        reconhecimento.start();
      } catch (erro) {
        estado.reconhecimentoAtivo = false;
        estado.reconhecimento = null;
        definirStatusVoz('Não consegui iniciar o reconhecimento. Verifique a permissão do microfone e tente novamente.');
        atualizarBotoes();
      }
    }

    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (fluxo) {
          fluxo.getTracks().forEach(function (faixa) {
            faixa.stop();
          });
          tentarIniciar();
        })
        .catch(function (erro) {
          estado.reconhecimentoAtivo = false;
          estado.reconhecimento = null;
          definirStatusVoz('Permissão do microfone negada ou indisponível. Autorize o microfone para este site e tente novamente.');
          atualizarBotoes();
        });
    } else {
      tentarIniciar();
    }
  }

  function adicionarFiltrosCor() {
    if (document.getElementById('sola-a11y-filters')) {
      return;
    }

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'sola-a11y-filters';
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none';
    svg.innerHTML =
      '<defs>' +
      '<filter id="sola-protanopia"><feColorMatrix type="matrix" values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"/></filter>' +
      '<filter id="sola-deuteranopia"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"/></filter>' +
      '<filter id="sola-tritanopia"><feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"/></filter>' +
      '</defs>';
    document.body.appendChild(svg);
  }

  function construir() {
    if (document.getElementById('sola-acessibilidade')) {
      return;
    }
    adicionarFiltrosCor();

    var raizMenu = document.createElement('div');
    raizMenu.id = 'sola-acessibilidade';
    raizMenu.innerHTML =
      '<button id="sola-a11y-trigger" class="sola-a11y-botao" type="button" aria-expanded="false" aria-controls="sola-a11y-painel" aria-label="Abrir menu de acessibilidade">♿</button>' +
      '<section id="sola-a11y-painel" class="sola-a11y-painel" role="dialog" aria-modal="false" aria-labelledby="sola-a11y-titulo" hidden>' +
        '<div class="sola-a11y-topo">' +
          '<div><h2 id="sola-a11y-titulo" class="sola-a11y-titulo">Acessibilidade</h2><p class="sola-a11y-subtitulo">Preferências salvas neste navegador.</p></div>' +
          '<button class="sola-a11y-fechar" type="button" data-a11y-close aria-label="Fechar menu">×</button>' +
        '</div>' +
        '<section class="sola-a11y-secao"><h3>Texto e leitura</h3><div class="sola-a11y-controles">' +
          '<button class="sola-a11y-controle" type="button" data-a11y-value="font:small">A−</button>' +
          '<button class="sola-a11y-controle" type="button" data-a11y-value="font:normal">A</button>' +
          '<button class="sola-a11y-controle" type="button" data-a11y-value="font:large">A+</button>' +
          '<button class="sola-a11y-controle" type="button" data-a11y-value="font:larger">A++</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-toggle="spacing" aria-pressed="false">Espaçar texto</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-toggle="dyslexia" aria-pressed="false">Modo de leitura para dislexia</button>' +
        '</div></section>' +
        '<section class="sola-a11y-secao"><h3>Contraste e cor</h3><div class="sola-a11y-grade">' +
          '<button class="sola-a11y-acao" type="button" data-a11y-value="contrast:high">Alto contraste</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-value="contrast:inverse">Contraste inverso</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-value="colorVision:protanopia">Protanopia</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-value="colorVision:deuteranopia">Deuteranopia</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-value="colorVision:tritanopia">Tritanopia</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-value="colorVision:normal">Cor normal</button>' +
        '</div></section>' +
        '<section class="sola-a11y-secao"><h3>Navegação e estímulos</h3><div class="sola-a11y-grade">' +
          '<button class="sola-a11y-acao" type="button" data-a11y-toggle="focus" aria-pressed="false">Foco destacado</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-toggle="clickArea" aria-pressed="false">Áreas de clique maiores</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-toggle="reduceMotion" aria-pressed="false">Pausar animações</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-toggle="readingMask" aria-pressed="false">Máscara de leitura</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-toggle="darkTheme" aria-pressed="false">Tema escuro</button>' +
        '</div></section>' +
        '<section class="sola-a11y-secao"><h3>Voz</h3><div class="sola-a11y-grade">' +
          '<button class="sola-a11y-acao" type="button" data-a11y-speak>🔊 Ler página</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-stop-speech>■ Parar leitura</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-command aria-pressed="false">🎙 Comando por voz</button>' +
        '</div><div class="sola-a11y-voz-status" data-a11y-voice-status aria-live="polite">Pronto para leitura.</div>' +
        '<p class="sola-a11y-ajuda">O reconhecimento de voz depende do navegador e da permissão do microfone. Diga “ler página”, “aumentar fonte”, “alto contraste” ou “fechar menu”.</p></section>' +
      '</section>';

    document.body.appendChild(raizMenu);

    var gatilho = document.getElementById('sola-a11y-trigger');
    var painel = document.getElementById('sola-a11y-painel');

    gatilho.addEventListener('click', function () {
      var abrindo = painel.hidden;
      painel.hidden = !abrindo;

      if (abrindo) {
        gatilho.setAttribute('aria-expanded', 'true');
      } else {
        gatilho.setAttribute('aria-expanded', 'false');
      }

      if (abrindo) {
        var primeiroBotao = painel.querySelector('button');
        if (primeiroBotao) {
          primeiroBotao.focus();
        }
      }
    });

    raizMenu.querySelector('[data-a11y-close]').addEventListener('click', fecharPainel);

    raizMenu.querySelectorAll('[data-a11y-toggle]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        alternar(botao.getAttribute('data-a11y-toggle'));
      });
    });

    raizMenu.querySelectorAll('[data-a11y-value]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var par = botao.getAttribute('data-a11y-value').split(':');
        definirOpcao(par[0], par[1]);
      });
    });

    raizMenu.querySelector('[data-a11y-speak]').addEventListener('click', function () {
      falar(obterTextoPagina());
    });
    raizMenu.querySelector('[data-a11y-stop-speech]').addEventListener('click', pararFala);
    raizMenu.querySelector('[data-a11y-command]').addEventListener('click', iniciarReconhecimento);

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') {
        if (estado.reconhecimentoAtivo) {
          pararReconhecimento();
        }

        var menu = document.getElementById('sola-a11y-painel');
        if (menu && !menu.hidden) {
          fecharPainel();
        }
      }
    });

    document.addEventListener('mousemove', function (evento) {
      if (!estado.readingMask) {
        return;
      }

      document.documentElement.style.setProperty('--sola-mascara-top', Math.max(8, Math.min(88, (evento.clientY / window.innerHeight) * 100)) + 'vh');
    }, { passive: true });

    document.addEventListener('focusin', function (evento) {
      if (estado.readingMask && evento.target && evento.target.scrollIntoView) {
        var comportamentoRolagem;
        if (estado.reduceMotion) {
          comportamentoRolagem = 'auto';
        } else {
          comportamentoRolagem = 'smooth';
        }

        try {
          evento.target.scrollIntoView({ block: 'center', behavior: comportamentoRolagem });
        } catch (erro) {
          return;
        }
      }
    });

    if ('speechSynthesis' in window && window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', escolherVoz);
    }

    aplicar();
  }

  window.SolaAccessibility = {
    construir: construir,
    aplicar: aplicar,
    falar: falar,
    pararFala: pararFala,
    iniciarReconhecimento: iniciarReconhecimento,
    pararReconhecimento: pararReconhecimento,
    estado: estado
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', construir);
  } else {
    construir();
  }
})();
