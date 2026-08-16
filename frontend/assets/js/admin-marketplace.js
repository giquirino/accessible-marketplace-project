
(function () {
  'use strict';
  var secao = 'dashboard';
  var cache = { catalogos: null };

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]; });
  }
  function brl(v) { return Number(v || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }
  function notify(msg, erro) { if (window.Sola && Sola.aviso) Sola.aviso(msg, erro ? 'erro' : 'ok'); else alert(msg); }

  function modal(titulo, conteudo, onConfirm) {
    var old = document.getElementById('admin-modal');
    if (old) old.remove();
    var dialog = document.createElement('dialog');
    dialog.id = 'admin-modal';
    dialog.className = 'dialogo';
    dialog.innerHTML = '<div class="dialogo-caixa"><header class="dialogo-topo"><h2 class="dialogo-titulo">' + esc(titulo) + '</h2><button class="botao-icone" type="button" data-close aria-label="Fechar">×</button></header><div class="dialogo-corpo admin-dialog-form">' + conteudo + '</div></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('[data-close]').addEventListener('click', function () { dialog.close(); dialog.remove(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) { dialog.close(); dialog.remove(); } });
    if (onConfirm) onConfirm(dialog);
    dialog.showModal();
  }

  function ensureAdmin() {
    var u = Sola.usuarioAtual && Sola.usuarioAtual();
    if (!Sola.logado() || !u || u.tipo !== 'admin') {
      document.getElementById('admin-marketplace').innerHTML = '<div class="cartao-form"><h2>Acesso restrito</h2><p>Esta área exige uma sessão de administrador.</p><a class="botao botao-preto" href="../../index.html">Voltar ao início</a></div>';
      return false;
    }
    return true;
  }

  async function api(path, options) {
    try { return await Sola.api(path, options); }
    catch (e) { notify(e.message, true); throw e; }
  }

  async function carregarResumo() {
    var r = await api('/admin/resumo');
    document.querySelector('[data-resumo="produtos"]').textContent = r.produtos;
    document.querySelector('[data-resumo="marcas"]').textContent = r.marcas;
    document.querySelector('[data-resumo="usuarios"]').textContent = r.usuarios;
  }

  function ativarSecao(nome) {
    secao = nome;
    document.querySelectorAll('.admin-aba').forEach(function (b) { b.classList.toggle('ativo', b.dataset.section === nome); b.setAttribute('aria-selected', b.dataset.section === nome ? 'true':'false'); });
    document.querySelectorAll('.admin-painel-secao').forEach(function (p) { p.classList.toggle('ativo', p.id === 'secao-' + nome); });
    if (nome === 'produtos') carregarProdutos();
    if (nome === 'marcas') carregarMarcas();
    if (nome === 'usuarios') carregarUsuarios();
  }

  async function catalogos() {
    if (!cache.catalogos) cache.catalogos = await api('/admin/catalogos');
    return cache.catalogos;
  }

  async function carregarProdutos() {
    var busca = document.getElementById('busca-produtos').value;
    var rows = await api('/admin/produtos?busca=' + encodeURIComponent(busca));
    var tbody = document.getElementById('tbody-produtos');
    tbody.innerHTML = rows.length ? rows.map(function (p) {
      return '<tr><td class="celula-forte">' + esc(p.nome) + '<div class="celula-apoio">' + esc(p.loja) + '</div></td><td>' + esc(p.marca) + '</td><td>' + esc(p.categoria) + '</td><td>' + brl(p.preco) + '</td><td><span class="etiqueta etiqueta-cinza">' + esc(p.status) + '</span></td><td class="acoes-linha"><button class="botao-icone" data-edit-produto="' + p.id_tenis + '" aria-label="Editar produto">✎</button><button class="botao-icone" data-del-produto="' + p.id_tenis + '" aria-label="Excluir produto">🗑</button></td></tr>';
    }).join('') : '<tr><td colspan="6" class="admin-vazio">Nenhum produto encontrado.</td></tr>';
    bindProductActions(rows);
  }

  function productForm(p, cats) {
    var marcas = cats.marcas.map(function (m) { return '<option value="' + m.id_marca + '" ' + (p && p.id_marca === m.id_marca ? 'selected':'') + '>' + esc(m.nome) + '</option>'; }).join('');
    var categorias = cats.categorias.map(function (c) { return '<option value="' + c.id_categoria + '" ' + (p && p.id_categoria === c.id_categoria ? 'selected':'') + '>' + esc(c.nome) + '</option>'; }).join('');
    var lojas = cats.lojas.map(function (l) { return '<option value="' + l.id_loja + '" ' + (p && p.id_loja === l.id_loja ? 'selected':'') + '>' + esc(l.nome) + '</option>'; }).join('');
    return '<form data-form-produto class="grade-form">' +
      '<div class="campo"><label for="adm-prod-nome">Nome</label><input id="adm-prod-nome" name="nome" required value="' + esc(p?.nome || '') + '"></div>' +
      '<div class="campo"><label for="adm-prod-preco">Preço</label><input id="adm-prod-preco" name="preco" type="number" min="0" step="0.01" required value="' + esc(p?.preco || '') + '"></div>' +
      '<div class="campo"><label for="adm-prod-marca">Marca</label><select id="adm-prod-marca" name="idMarca" required>' + marcas + '</select></div>' +
      '<div class="campo"><label for="adm-prod-cat">Categoria</label><select id="adm-prod-cat" name="idCategoria" required>' + categorias + '</select></div>' +
      '<div class="campo"><label for="adm-prod-loja">Loja</label><select id="adm-prod-loja" name="idLoja" required>' + lojas + '</select></div>' +
      '<div class="campo"><label for="adm-prod-status">Status</label><select id="adm-prod-status" name="status"><option value="ativo" ' + (p?.status === 'ativo' ? 'selected':'') + '>Ativo</option><option value="inativo" ' + (p?.status === 'inativo' ? 'selected':'') + '>Inativo</option><option value="em_analise" ' + (p?.status === 'em_analise' ? 'selected':'') + '>Em análise</option></select></div>' +
      '<div class="campo campo-largo"><label for="adm-prod-desc">Descrição</label><textarea id="adm-prod-desc" name="descricao">' + esc(p?.descricao || '') + '</textarea></div>' +
      '<div class="admin-form-actions campo-largo"><button class="botao botao-branco" type="button" data-close>Cancelar</button><button class="botao botao-preto" type="submit">Salvar</button></div>' +
      '</form>';
  }

  async function editarProduto(p) {
    var cats = await catalogos();
    modal(p ? 'Editar produto' : 'Novo produto', productForm(p, cats), function (dialog) {
      dialog.querySelector('[data-close]').addEventListener('click', function () { dialog.close(); dialog.remove(); });
      dialog.querySelector('[data-form-produto]').addEventListener('submit', async function (e) {
        e.preventDefault();
        var f = new FormData(e.currentTarget);
        var payload = Object.fromEntries(f.entries());
        ['idMarca','idCategoria','idLoja'].forEach(function(k){ payload[k] = Number(payload[k]); });
        payload.preco = Number(payload.preco);
        await api(p ? '/admin/produtos/' + p.id_tenis : '/admin/produtos', { method: p ? 'PUT' : 'POST', body: JSON.stringify(payload) });
        dialog.close(); dialog.remove(); notify(p ? 'Produto atualizado.' : 'Produto criado.'); carregarProdutos(); carregarResumo();
      });
    });
  }

  function bindProductActions(rows) {
    document.querySelectorAll('[data-edit-produto]').forEach(function (b) {
      b.addEventListener('click', function () { var p = rows.find(function(x){ return String(x.id_tenis)===b.dataset.editProduto; }); editarProduto(p); });
    });
    document.querySelectorAll('[data-del-produto]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('Excluir este produto permanentemente?')) return;
        await api('/admin/produtos/' + b.dataset.delProduto, { method:'DELETE' });
        notify('Produto excluído.'); carregarProdutos(); carregarResumo();
      });
    });
  }

  async function carregarMarcas() {
    var rows = await api('/admin/marcas');
    var tbody = document.getElementById('tbody-marcas');
    tbody.innerHTML = rows.length ? rows.map(function(m){
      return '<tr><td class="celula-forte">' + esc(m.nome) + '</td><td>' + m.produtos + '</td><td class="acoes-linha"><button class="botao-icone" data-edit-marca="' + m.id_marca + '" aria-label="Editar marca">✎</button><button class="botao-icone" data-del-marca="' + m.id_marca + '" aria-label="Excluir marca">🗑</button></td></tr>';
    }).join('') : '<tr><td colspan="3" class="admin-vazio">Nenhuma marca cadastrada.</td></tr>';
    document.querySelectorAll('[data-edit-marca]').forEach(function(b){ b.onclick=function(){ var m=rows.find(function(x){return String(x.id_marca)===b.dataset.editMarca;}); editarMarca(m); }; });
    document.querySelectorAll('[data-del-marca]').forEach(function(b){ b.onclick=async function(){ if(!confirm('Excluir esta marca?'))return; await api('/admin/marcas/'+b.dataset.delMarca,{method:'DELETE'}); notify('Marca excluída.'); carregarMarcas(); carregarResumo(); }; });
  }
  function editarMarca(m) {
    modal(m ? 'Editar marca' : 'Nova marca', '<form data-form-marca><div class="campo"><label for="adm-marca-nome">Nome</label><input id="adm-marca-nome" name="nome" required value="' + esc(m?.nome || '') + '"></div><div class="admin-form-actions"><button class="botao botao-branco" type="button" data-close>Cancelar</button><button class="botao botao-preto" type="submit">Salvar</button></div></form>', function(dialog){
      dialog.querySelector('[data-close]').onclick=function(){dialog.close();dialog.remove();};
      dialog.querySelector('[data-form-marca]').onsubmit=async function(e){e.preventDefault();var nome=new FormData(e.currentTarget).get('nome');await api(m?'/admin/marcas/'+m.id_marca:'/admin/marcas',{method:m?'PUT':'POST',body:JSON.stringify({nome:nome})});dialog.close();dialog.remove();notify(m?'Marca atualizada.':'Marca criada.');carregarMarcas();carregarResumo();cache.catalogos=null;};
    });
  }

  async function carregarUsuarios() {
    var busca = document.getElementById('busca-usuarios').value;
    var tipo = document.getElementById('filtro-usuario').value;
    var qs = '/admin/usuarios?busca=' + encodeURIComponent(busca) + (tipo ? '&tipo=' + encodeURIComponent(tipo) : '');
    var rows = await api(qs);
    var tbody = document.getElementById('tbody-usuarios');
    tbody.innerHTML = rows.length ? rows.map(function(u){
      return '<tr><td class="celula-forte">' + esc(u.nome) + '</td><td class="apagado">' + esc(u.email) + '</td><td><span class="etiqueta etiqueta-cinza">' + esc(u.tipo) + '</span></td><td class="acoes-linha"><button class="botao-icone" data-edit-user="' + u.id_usuario + '" aria-label="Editar usuário">✎</button><button class="botao-icone" data-del-user="' + u.id_usuario + '" aria-label="Excluir usuário">🗑</button></td></tr>';
    }).join('') : '<tr><td colspan="4" class="admin-vazio">Nenhum usuário encontrado.</td></tr>';
    document.querySelectorAll('[data-edit-user]').forEach(function(b){ b.onclick=function(){editarUsuario(rows.find(function(x){return String(x.id_usuario)===b.dataset.editUser;}));};});
    document.querySelectorAll('[data-del-user]').forEach(function(b){ b.onclick=async function(){if(!confirm('Excluir este usuário? Esta operação depende das regras de integridade do banco.'))return;await api('/admin/usuarios/'+b.dataset.delUser,{method:'DELETE'});notify('Usuário excluído.');carregarUsuarios();carregarResumo();};});
  }

  function editarUsuario(u) {
    var form = '<form data-form-usuario class="grade-form">' +
      '<div class="campo"><label for="adm-user-nome">Nome</label><input id="adm-user-nome" name="nome" required value="' + esc(u?.nome || '') + '"></div>' +
      '<div class="campo"><label for="adm-user-email">E-mail</label><input id="adm-user-email" name="email" type="email" required value="' + esc(u?.email || '') + '"></div>' +
      (!u ? '<div class="campo"><label for="adm-user-senha">Senha inicial</label><input id="adm-user-senha" name="senha" type="password" minlength="8" required></div>' : '') +
      '<div class="campo"><label for="adm-user-tipo">Papel</label><select id="adm-user-tipo" name="tipo"><option value="cliente" ' + (u?.tipo==='cliente'?'selected':'') + '>Cliente</option><option value="vendedor" ' + (u?.tipo==='vendedor'?'selected':'') + '>Vendedor</option><option value="admin" ' + (u?.tipo==='admin'?'selected':'') + '>Administrador</option></select></div>' +
      '<div class="admin-form-actions campo-largo"><button class="botao botao-branco" type="button" data-close>Cancelar</button><button class="botao botao-preto" type="submit">Salvar</button></div></form>';
    modal(u ? 'Editar usuário' : 'Novo usuário', form, function(dialog){
      dialog.querySelector('[data-close]').onclick=function(){dialog.close();dialog.remove();};
      dialog.querySelector('[data-form-usuario]').onsubmit=async function(e){e.preventDefault();var payload=Object.fromEntries(new FormData(e.currentTarget).entries());var path=u?'/admin/usuarios/'+u.id_usuario:'/admin/usuarios';await api(path,{method:u?'PUT':'POST',body:JSON.stringify(payload)});dialog.close();dialog.remove();notify(u?'Usuário atualizado.':'Usuário criado.');carregarUsuarios();carregarResumo();};
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!ensureAdmin()) return;
    document.querySelectorAll('.admin-aba').forEach(function (b) { b.onclick = function () { ativarSecao(b.dataset.section); }; });
    document.getElementById('busca-produtos').addEventListener('input', function(){ clearTimeout(window.__sp); window.__sp=setTimeout(carregarProdutos,250); });
    document.getElementById('busca-usuarios').addEventListener('input', function(){ clearTimeout(window.__su); window.__su=setTimeout(carregarUsuarios,250); });
    document.getElementById('filtro-usuario').addEventListener('change', carregarUsuarios);
    document.getElementById('novo-produto').onclick=function(){editarProduto(null);};
    document.getElementById('nova-marca').onclick=function(){editarMarca(null);};
    document.getElementById('novo-usuario').onclick=function(){editarUsuario(null);};
    carregarResumo().catch(function(){});
    ativarSecao('produtos');
  });
})();
