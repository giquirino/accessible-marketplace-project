(function () {
  'use strict';

  if (window.SolaAccessibility) return;

  var STORAGE = {
    font: 'solaA11yFont',
    contrast: 'solaA11yContrast',
    colorVision: 'solaA11yColorVision',
    dyslexia: 'solaA11yDyslexia',
    focus: 'solaA11yFocus',
    clickArea: 'solaA11yClickArea',
    spacing: 'solaA11ySpacing',
    reduceMotion: 'solaA11yReduceMotion',
    readingMask: 'solaA11yReadingMask'
  };

  var state = {
    font: localStorage.getItem(STORAGE.font) || 'normal',
    contrast: localStorage.getItem(STORAGE.contrast) || 'normal',
    colorVision: localStorage.getItem(STORAGE.colorVision) || 'normal',
    dyslexia: localStorage.getItem(STORAGE.dyslexia) === '1',
    focus: localStorage.getItem(STORAGE.focus) === '1',
    clickArea: localStorage.getItem(STORAGE.clickArea) === '1',
    spacing: localStorage.getItem(STORAGE.spacing) === '1',
    reduceMotion: localStorage.getItem(STORAGE.reduceMotion) === '1',
    readingMask: localStorage.getItem(STORAGE.readingMask) === '1',
    recognition: null,
    recognitionBusy: false,
    voices: []
  };

  var FONT_SCALE = {
    small: 0.90,
    normal: 1,
    large: 1.10,
    larger: 1.20
  };

  /* Somente elementos que realmente exibem texto. Containers, imagens e elementos
     com aria-label foram removidos para que A-/A+ não redimensione a composição. */
  var FONT_SELECTORS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'li', 'dt', 'dd', 'label', 'legend',
    'button', 'input', 'select', 'textarea',
    'a', 'th', 'td', 'caption', 'figcaption',
    'blockquote', 'small', 'strong', 'em',
    '[role="button"]', '[role="option"]', '[role="tab"]',
    '[role="menuitem"]'
  ].join(',');

  function save(key, value) {
    var storageKey = STORAGE[key];
    if (!storageKey) return;
    localStorage.setItem(storageKey, value ? '1' : value);
  }

  function getContentRoot() {
    return document.querySelector('main, [role="main"], #conteudo') || document.body;
  }

  function applyFontScale() {
    var scale = FONT_SCALE[state.font] || 1;
    var root = getContentRoot();
    if (!root) return;

    root.querySelectorAll(FONT_SELECTORS).forEach(function (el) {
      if (el.closest('#sola-acessibilidade')) return;
      var original = parseFloat(el.getAttribute('data-sola-a11y-font-original'));

      /* Grava o tamanho original uma única vez. Isso evita a multiplicação
         da escala em elementos aninhados a cada troca de A-/A+. */
      if (!Number.isFinite(original)) {
        var computed = window.getComputedStyle(el);
        original = parseFloat(computed.fontSize);
        if (!Number.isFinite(original) || original < 8 || original > 96) return;
        el.setAttribute('data-sola-a11y-font-original', String(original));
      }

      el.style.fontSize = scale === 1 ? '' : (original * scale) + 'px';
    });
  }

  function clearTransientFontScale() {
    var root = getContentRoot();
    if (!root) return;
    root.querySelectorAll('[data-sola-a11y-font-original]').forEach(function (el) {
      el.style.fontSize = '';
    });
  }

  function apply() {
    var root = document.documentElement;

    /* Corrige combinações antigas salvas no navegador antes desta versão. */
    if (state.contrast !== 'normal' && state.colorVision !== 'normal') {
      state.colorVision = 'normal';
      save('colorVision', state.colorVision);
    }

    root.classList.remove(
      'sola-a11y-espacamento',
      'sola-a11y-foco',
      'sola-a11y-area-clique',
      'sola-a11y-dislexia',
      'sola-a11y-reduzir-estimulos',
      'sola-a11y-mascara',
      'sola-a11y-alto-contraste',
      'sola-a11y-inverso',
      'sola-a11y-protanopia',
      'sola-a11y-deuteranopia',
      'sola-a11y-tritanopia'
    );

    if (state.spacing) root.classList.add('sola-a11y-espacamento');
    if (state.focus) root.classList.add('sola-a11y-foco');
    if (state.clickArea) root.classList.add('sola-a11y-area-clique');
    if (state.dyslexia) root.classList.add('sola-a11y-dislexia');
    if (state.reduceMotion) root.classList.add('sola-a11y-reduzir-estimulos');
    if (state.readingMask) root.classList.add('sola-a11y-mascara');
    if (state.contrast === 'high') root.classList.add('sola-a11y-alto-contraste');
    if (state.contrast === 'inverse') root.classList.add('sola-a11y-inverso');
    if (state.colorVision !== 'normal') root.classList.add('sola-a11y-' + state.colorVision);

    clearTransientFontScale();
    window.requestAnimationFrame(applyFontScale);
    updateButtons();
  }

  function updateButtons() {
    var menu = document.getElementById('sola-acessibilidade');
    if (!menu) return;

    menu.querySelectorAll('[data-a11y-toggle]').forEach(function (button) {
      var key = button.getAttribute('data-a11y-toggle');
      button.setAttribute('aria-pressed', state[key] ? 'true' : 'false');
    });

    menu.querySelectorAll('[data-a11y-value]').forEach(function (button) {
      var pair = button.getAttribute('data-a11y-value').split(':');
      button.setAttribute('aria-pressed', state[pair[0]] === pair[1] ? 'true' : 'false');
    });

    var commandButton = menu.querySelector('[data-a11y-command]');
    if (commandButton) {
      commandButton.setAttribute('aria-pressed', state.recognitionBusy ? 'true' : 'false');
      commandButton.textContent = state.recognitionBusy ? '■ Parar comando por voz' : '🎙 Comando por voz';
    }
  }

  function setState(key, value) {
    state[key] = value;
    save(key, value);
    apply();
  }

  function setOption(key, value) {
    /* Contraste e simulação de cores são modos visuais exclusivos.
       Clicar no modo já ativo volta para o estado normal. */
    if (key === 'contrast') {
      var nextContrast = state.contrast === value ? 'normal' : value;
      state.contrast = nextContrast;
      state.colorVision = 'normal';
      save('contrast', state.contrast);
      save('colorVision', state.colorVision);
      apply();
      return;
    }

    if (key === 'colorVision') {
      var nextColor = state.colorVision === value ? 'normal' : value;
      state.colorVision = nextColor;
      state.contrast = 'normal';
      save('colorVision', state.colorVision);
      save('contrast', state.contrast);
      apply();
      return;
    }

    setState(key, value);
  }

  function toggle(key) {
    setState(key, !state[key]);
  }

  function closePanel() {
    stopRecognition();
    var panel = document.getElementById('sola-a11y-painel');
    var trigger = document.getElementById('sola-a11y-trigger');
    if (panel) panel.hidden = true;
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getPageText() {
    var target = getContentRoot();
    if (!target) return '';
    var clone = target.cloneNode(true);
    clone.querySelectorAll('#sola-acessibilidade, script, style, noscript, [aria-hidden="true"]').forEach(function (el) { el.remove(); });
    return (clone.innerText || clone.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000);
  }

  function stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setVoiceStatus('Leitura interrompida.');
  }

  function splitSpeechText(text) {
    var chunks = [];
    String(text || '').split(/(?<=[.!?])\s+/).forEach(function (part) {
      var current = part.trim();
      while (current.length > 260) {
        var cut = current.lastIndexOf(' ', 260);
        if (cut < 80) cut = 260;
        chunks.push(current.slice(0, cut));
        current = current.slice(cut).trim();
      }
      if (current) chunks.push(current);
    });
    return chunks.slice(0, 60);
  }

  function chooseVoice() {
    if (!('speechSynthesis' in window)) return null;
    var voices = window.speechSynthesis.getVoices() || [];
    state.voices = voices;
    return voices.find(function (v) { return /^pt-BR$/i.test(v.lang); }) ||
      voices.find(function (v) { return /^pt[-_]/i.test(v.lang); }) ||
      voices.find(function (v) { return v.default; }) || null;
  }

  function speak(text) {
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') {
      setVoiceStatus('Seu navegador não oferece leitura de texto por voz.');
      return;
    }

    var clean = String(text || '').trim();
    if (!clean) {
      setVoiceStatus('Não encontrei texto principal nesta página para ler.');
      return;
    }

    var synth = window.speechSynthesis;
    synth.cancel();
    var chunks = splitSpeechText(clean);
    var index = 0;
    var voice = chooseVoice();

    function next() {
      if (index >= chunks.length) {
        setVoiceStatus('Leitura concluída.');
        return;
      }
      var utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utterance.lang = voice && voice.lang ? voice.lang : 'pt-BR';
      utterance.voice = voice || null;
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.onstart = function () {
        setVoiceStatus('Lendo a página… ' + index + '/' + chunks.length);
      };
      utterance.onerror = function (event) {
        setVoiceStatus('Não foi possível continuar a leitura: ' + (event.error || 'erro de voz') + '.');
      };
      utterance.onend = next;
      synth.speak(utterance);
    }

    next();
  }

  function setVoiceStatus(message) {
    var el = document.querySelector('[data-a11y-voice-status]');
    if (el) el.textContent = message;
  }

  function recognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function recognitionErrorMessage(error) {
    var messages = {
      'not-allowed': 'O navegador bloqueou o microfone. Permita o acesso ao microfone para este site e tente novamente.',
      'service-not-allowed': 'O reconhecimento de voz está bloqueado pelo navegador ou pela política da página.',
      'audio-capture': 'Nenhum microfone disponível foi encontrado.',
      'no-speech': 'Não detectei fala. Fale depois que aparecer “Escutando”.',
      'network': 'O serviço de reconhecimento de voz não respondeu. Verifique sua conexão e tente novamente.',
      'aborted': 'O comando por voz foi interrompido.',
      'language-not-supported': 'O idioma português não está disponível para o reconhecimento de voz neste navegador.'
    };
    return messages[error] || 'Não foi possível iniciar o reconhecimento de voz. Tente novamente.';
  }

  function executeVoiceCommand(transcript) {
    var command = normalize(transcript);
    setVoiceStatus('Comando recebido: “' + transcript + '”');

    if (command.includes('parar leitura') || command.includes('parar voz') || command.includes('silencio')) {
      stopSpeech();
      return;
    }
    if (command.includes('ler pagina') || command.includes('ler a pagina') || command === 'ler' || command.includes('leia pagina')) {
      speak(getPageText());
      return;
    }
    if (command.includes('aumentar fonte') || command.includes('aumente a fonte') || command.includes('aumentar o tamanho da fonte') || command.includes('fonte maior') || command === 'mais fonte') {
      var up = state.font === 'small' ? 'normal' : state.font === 'normal' ? 'large' : 'larger';
      setState('font', up);
      speak('Tamanho da fonte aumentado.');
      return;
    }
    if (command.includes('diminuir fonte') || command.includes('diminua a fonte') || command.includes('diminuir o tamanho da fonte') || command.includes('fonte menor') || command === 'menos fonte') {
      var down = state.font === 'larger' ? 'large' : state.font === 'large' ? 'normal' : 'small';
      setState('font', down);
      speak('Tamanho da fonte diminuído.');
      return;
    }
    if (command.includes('fonte normal') || command.includes('tamanho normal')) {
      setState('font', 'normal');
      speak('Fonte normal ativada.');
      return;
    }
    if (command.includes('alto contraste') || command.includes('contraste alto')) {
      setState('contrast', state.contrast === 'high' ? 'normal' : 'high');
      speak(state.contrast === 'high' ? 'Alto contraste ativado.' : 'Alto contraste desativado.');
      return;
    }
    if (command.includes('contraste inverso') || command.includes('inverter contraste') || command.includes('inverter cores')) {
      setState('contrast', state.contrast === 'inverse' ? 'normal' : 'inverse');
      speak(state.contrast === 'inverse' ? 'Contraste inverso ativado.' : 'Contraste inverso desativado.');
      return;
    }
    if (command.includes('modo dislexia') || command.includes('fonte dislexia')) {
      toggle('dyslexia');
      speak(state.dyslexia ? 'Modo para dislexia ativado.' : 'Modo para dislexia desativado.');
      return;
    }
    if (command.includes('espacar texto') || command.includes('espacamento de texto')) {
      toggle('spacing');
      speak(state.spacing ? 'Espaçamento de texto ativado.' : 'Espaçamento de texto desativado.');
      return;
    }
    if (command.includes('pausar animacao') || command.includes('parar animacoes') || command.includes('reduzir movimento')) {
      toggle('reduceMotion');
      speak(state.reduceMotion ? 'Animações reduzidas.' : 'Animações restauradas.');
      return;
    }
    if (command.includes('foco destacado') || command.includes('destacar foco')) {
      toggle('focus');
      speak(state.focus ? 'Foco destacado ativado.' : 'Foco destacado desativado.');
      return;
    }
    if (command.includes('areas de clique') || command.includes('botoes maiores')) {
      toggle('clickArea');
      speak(state.clickArea ? 'Áreas de clique ampliadas.' : 'Áreas de clique normais.');
      return;
    }
    if (command.includes('mascara de leitura') || command.includes('modo leitura')) {
      toggle('readingMask');
      speak(state.readingMask ? 'Máscara de leitura ativada.' : 'Máscara de leitura desativada.');
      return;
    }
    if (command.includes('cor normal')) {
      setState('colorVision', 'normal');
      speak('Cores normais restauradas.');
      return;
    }
    if (command.includes('protanopia')) { setState('colorVision', 'protanopia'); speak('Filtro para protanopia ativado.'); return; }
    if (command.includes('deuteranopia')) { setState('colorVision', 'deuteranopia'); speak('Filtro para deuteranopia ativado.'); return; }
    if (command.includes('tritanopia')) { setState('colorVision', 'tritanopia'); speak('Filtro para tritanopia ativado.'); return; }
    if (command.includes('fechar menu') || command === 'fechar') {
      closePanel();
      return;
    }
    setVoiceStatus('Não reconheci esse comando. Diga, por exemplo, “ler página”, “aumentar fonte” ou “alto contraste”.');
    speak('Comando não reconhecido.');
  }

  function stopRecognition() {
    if (state.recognition) {
      try { state.recognition.onend = null; state.recognition.stop(); } catch (_) {}
      state.recognition = null;
    }
    state.recognitionBusy = false;
    updateButtons();
  }

  function startRecognition() {
    var Recognition = recognitionConstructor();
    if (!Recognition) {
      setVoiceStatus('Seu navegador não disponibiliza reconhecimento de voz. Para esta função, use Chrome ou Edge em uma conexão segura (HTTPS ou localhost).');
      return;
    }

    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' && location.hostname !== '[::1]') {
      setVoiceStatus('O comando por voz precisa de HTTPS ou localhost. Não funciona abrindo o HTML diretamente pelo arquivo.');
      return;
    }

    if (state.recognitionBusy) {
      stopRecognition();
      setVoiceStatus('Comandos por voz interrompidos.');
      return;
    }

    var rec = new Recognition();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    rec.onstart = function () {
      state.recognitionBusy = true;
      state.recognition = rec;
      setVoiceStatus('Escutando… fale agora.');
      updateButtons();
    };

    rec.onresult = function (event) {
      var result = event.results && event.results[0] && event.results[0][0];
      if (result && result.transcript) executeVoiceCommand(result.transcript);
    };

    rec.onerror = function (event) {
      state.recognitionBusy = false;
      state.recognition = null;
      setVoiceStatus(recognitionErrorMessage(event.error));
      updateButtons();
    };

    rec.onend = function () {
      state.recognitionBusy = false;
      state.recognition = null;
      updateButtons();
    };

    state.recognition = rec;
    state.recognitionBusy = true;
    updateButtons();
    setVoiceStatus('Solicitando acesso ao microfone…');

    function iniciarReconhecimento() {
      try {
        rec.start();
      } catch (error) {
        state.recognitionBusy = false;
        state.recognition = null;
        setVoiceStatus('Não consegui iniciar o reconhecimento. Verifique a permissão do microfone e tente novamente.');
        updateButtons();
      }
    }

    /* Alguns navegadores só liberam o reconhecimento depois que a permissão
       do microfone foi concedida explicitamente. O pedido ocorre após o clique
       do usuário, então continua sendo um gesto válido. */
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
          stream.getTracks().forEach(function (track) { track.stop(); });
          iniciarReconhecimento();
        })
        .catch(function () {
          state.recognitionBusy = false;
          state.recognition = null;
          setVoiceStatus('Permissão do microfone negada ou indisponível. Autorize o microfone para este site e tente novamente.');
          updateButtons();
        });
    } else {
      iniciarReconhecimento();
    }
  }

  function addColorFilters() {
    if (document.getElementById('sola-a11y-filters')) return;
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

  function build() {
    if (document.getElementById('sola-acessibilidade')) return;
    addColorFilters();

    var wrap = document.createElement('div');
    wrap.id = 'sola-acessibilidade';
    wrap.innerHTML =
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
        '</div></section>' +
        '<section class="sola-a11y-secao"><h3>Voz</h3><div class="sola-a11y-grade">' +
          '<button class="sola-a11y-acao" type="button" data-a11y-speak>🔊 Ler página</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-stop-speech>■ Parar leitura</button>' +
          '<button class="sola-a11y-acao" type="button" data-a11y-command aria-pressed="false">🎙 Comando por voz</button>' +
        '</div><div class="sola-a11y-voz-status" data-a11y-voice-status aria-live="polite">Pronto para leitura.</div>' +
        '<p class="sola-a11y-ajuda">O reconhecimento de voz depende do navegador e da permissão do microfone. Diga “ler página”, “aumentar fonte”, “alto contraste” ou “fechar menu”.</p></section>' +
      '</section>';

    document.body.appendChild(wrap);

    var trigger = document.getElementById('sola-a11y-trigger');
    var panel = document.getElementById('sola-a11y-painel');

    trigger.addEventListener('click', function () {
      var opening = panel.hidden;
      panel.hidden = !opening;
      trigger.setAttribute('aria-expanded', opening ? 'true' : 'false');
      if (opening) {
        var first = panel.querySelector('button');
        if (first) first.focus();
      }
    });

    wrap.querySelector('[data-a11y-close]').addEventListener('click', closePanel);
    wrap.querySelectorAll('[data-a11y-toggle]').forEach(function (button) {
      button.addEventListener('click', function () { toggle(button.getAttribute('data-a11y-toggle')); });
    });
    wrap.querySelectorAll('[data-a11y-value]').forEach(function (button) {
      button.addEventListener('click', function () {
        var pair = button.getAttribute('data-a11y-value').split(':');
        setOption(pair[0], pair[1]);
      });
    });
    wrap.querySelector('[data-a11y-speak]').addEventListener('click', function () { speak(getPageText()); });
    wrap.querySelector('[data-a11y-stop-speech]').addEventListener('click', stopSpeech);
    wrap.querySelector('[data-a11y-command]').addEventListener('click', startRecognition);

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (state.recognitionBusy) stopRecognition();
        var menu = document.getElementById('sola-a11y-painel');
        if (menu && !menu.hidden) closePanel();
      }
    });

    document.addEventListener('mousemove', function (event) {
      if (!state.readingMask) return;
      document.documentElement.style.setProperty('--sola-mascara-top', Math.max(8, Math.min(88, (event.clientY / window.innerHeight) * 100)) + 'vh');
    }, { passive: true });

    document.addEventListener('focusin', function (event) {
      if (state.readingMask && event.target && event.target.scrollIntoView) {
        try { event.target.scrollIntoView({ block: 'center', behavior: state.reduceMotion ? 'auto' : 'smooth' }); } catch (_) {}
      }
    });

    if ('speechSynthesis' in window && window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', chooseVoice);
    }

    apply();
  }

  window.SolaAccessibility = {
    build: build,
    apply: apply,
    speak: speak,
    stopSpeech: stopSpeech,
    startRecognition: startRecognition,
    stopRecognition: stopRecognition,
    state: state
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
