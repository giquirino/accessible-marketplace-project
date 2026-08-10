window.Sola = window.Sola || {};
document.title = document.title.replace(/Sola/g, 'Last Dance Club');
Sola.raiz = (function () { var s = document.currentScript || document.querySelector('script[src*="assets/js/core.js"]'); return s ? s.src.replace(/assets\/js\/core\.js.*$/, '') : ''; })();
Sola.inicioPorTipo = { admin: 'pages/admin/admin-dashboard.html', vendedor: 'pages/vendedor/vendedor-dashboard.html', cliente: 'pages/cliente/cliente-dashboard.html' };
Sola.apiUrl = window.SOLA_API_URL || 'http://127.0.0.1:3000/api';
Sola.api = async function (caminho, opcoes) {
  var configuracao = opcoes || {}, cabecalhos = Object.assign({ 'Content-Type': 'application/json' }, configuracao.headers || {}), token = localStorage.getItem('token');
  if (token) cabecalhos.Authorization = 'Bearer ' + token;
  var resposta;
  try { resposta = await fetch(Sola.apiUrl + caminho, Object.assign({}, configuracao, { headers: cabecalhos })); } catch (_erro) { throw new Error('Não foi possível conectar à API. Confirme se o backend está em execução na porta 3000.'); }
  var dados = resposta.status === 204 ? null : await resposta.json().catch(function () { return {}; });
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível concluir a solicitação.');
  return dados;
};
Sola.url = function (caminho) { return Sola.raiz + caminho; };
Sola.prefereMenosMovimento = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
Sola.aviso = function (mensagem) {
  var pilha = document.getElementById('sola-avisos');
  if (!pilha) { pilha = document.createElement('div'); pilha.id = 'sola-avisos'; document.body.appendChild(pilha); }
  var aviso = document.createElement('div'); aviso.className = 'aviso'; aviso.setAttribute('role', 'status'); aviso.textContent = mensagem; pilha.appendChild(aviso);
  setTimeout(function () { aviso.classList.add('saindo'); setTimeout(function () { aviso.remove(); }, 320); }, 3000);
};
Sola.carregarScript = function (arquivo, pronto) {
  var script = document.createElement('script'); script.src = Sola.url(arquivo); script.onload = pronto; script.onerror = function () { console.warn('Não foi possível carregar', arquivo); }; document.head.appendChild(script);
};
Sola.carregarScript('assets/js/vlibras-widget.js', function () {});
