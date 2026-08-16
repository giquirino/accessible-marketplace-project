(function () {
  'use strict';

  var secaoAtiva = 'dashboard';
  var cache = { catalogos: null };

  var CARACTERES_HTML = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  function escaparHtml(valor) {
    var valorBase = valor;

    if (valor === undefined || valor === null) {
      valorBase = '';
    }

    var texto = String(valorBase);

    return texto.replace(/[&<>"']/g, function (caractere) {
      return CARACTERES_HTML[caractere];
    });
  }

  function avisar(mensagem, ehErro) {
    if (window.Sola && Sola.aviso) {
      var tipoAviso = 'ok';

      if (ehErro) {
        tipoAviso = 'erro';
      }

      Sola.aviso(mensagem, tipoAviso);
    } else {
      alert(mensagem);
    }
  }

  function abrirModal(titulo, conteudo, aoConfirmar) {
    var modalAntigo = document.getElementById('admin-modal');

    if (modalAntigo) {
      modalAntigo.remove();
    }

    var dialogo = document.createElement('dialog');
    dialogo.id = 'admin-modal';
    dialogo.className = 'dialogo';
    dialogo.innerHTML =
      '<div class="dialogo-caixa">' +
        '<header class="dialogo-topo">' +
          '<h2 class="dialogo-titulo">' + escaparHtml(titulo) + '</h2>' +
          '<button class="botao-icone" type="button" data-close aria-label="Fechar">×</button>' +
        '</header>' +
        '<div class="dialogo-corpo admin-dialog-form">' + conteudo + '</div>' +
      '</div>';

    document.body.appendChild(dialogo);

    dialogo.addEventListener('close', function () {
      dialogo.remove();
    });

    dialogo.querySelector('[data-close]').addEventListener('click', function () {
      Sola.fecharDialogo(dialogo);
    });

    dialogo.addEventListener('click', function (evento) {
      if (evento.target === dialogo) {
        Sola.fecharDialogo(dialogo);
      }
    });

    if (aoConfirmar) {
      aoConfirmar(dialogo);
    }

    dialogo.showModal();
  }

  function garantirAdmin() {
    var usuario = Sola.usuarioAtual && Sola.usuarioAtual();
    var temAcesso = Sola.logado() && usuario && usuario.tipo === 'admin';

    if (!temAcesso) {
      document.getElementById('admin-marketplace').innerHTML =
        '<div class="cartao-form">' +
          '<h2>Acesso restrito</h2>' +
          '<p>Esta área exige uma sessão de administrador.</p>' +
          '<a class="botao botao-preto" href="../../index.html">Voltar ao início</a>' +
        '</div>';
      return false;
    }

    return true;
  }

  async function chamarApi(caminho, opcoes) {
    try {
      return await Sola.api(caminho, opcoes);
    } catch (erro) {
      avisar(erro.message, true);
      throw erro;
    }
  }

  function caminhoEMetodo(caminhoBase, id) {
    var caminho = caminhoBase;
    var metodo = 'POST';

    if (id) {
      caminho = caminhoBase + '/' + id;
      metodo = 'PUT';
    }

    return { caminho: caminho, metodo: metodo };
  }

  function textoCriadoOuAtualizado(itemExistente, textoCriado, textoAtualizado) {
    if (itemExistente) {
      return textoAtualizado;
    }
    return textoCriado;
  }

  async function carregarResumo() {
    var resumo = await chamarApi('/admin/resumo');

    document.querySelector('[data-resumo="produtos"]').textContent = resumo.produtos;
    document.querySelector('[data-resumo="marcas"]').textContent = resumo.marcas;
    document.querySelector('[data-resumo="usuarios"]').textContent = resumo.usuarios;
  }

  function ativarSecao(nome) {
    secaoAtiva = nome;

    document.querySelectorAll('.admin-aba').forEach(function (botao) {
      var ativo = botao.dataset.section === nome;
      botao.classList.toggle('ativo', ativo);

      var valorSelecionado = 'false';

      if (ativo) {
        valorSelecionado = 'true';
      }

      botao.setAttribute('aria-selected', valorSelecionado);
    });

    document.querySelectorAll('.admin-painel-secao').forEach(function (painel) {
      painel.classList.toggle('ativo', painel.id === 'secao-' + nome);
    });

    if (nome === 'produtos') {
      carregarProdutos();
    }

    if (nome === 'marcas') {
      carregarMarcas();
    }

    if (nome === 'usuarios') {
      carregarUsuarios();
    }
  }

  async function obterCatalogosDeApoio() {
    if (!cache.catalogos) {
      cache.catalogos = await chamarApi('/admin/catalogos');
    }

    return cache.catalogos;
  }

  function linhaDeProduto(produto) {
    return '<tr>' +
      '<td class="celula-forte">' + escaparHtml(produto.nome) + '<div class="celula-apoio">' + escaparHtml(produto.loja) + '</div></td>' +
      '<td>' + escaparHtml(produto.marca) + '</td>' +
      '<td>' + escaparHtml(produto.categoria) + '</td>' +
      '<td>' + Sola.formatarPreco(produto.preco) + '</td>' +
      '<td><span class="etiqueta etiqueta-cinza">' + escaparHtml(produto.status) + '</span></td>' +
      '<td class="acoes-linha">' +
        '<button class="botao-icone" data-edit-produto="' + produto.id_tenis + '" aria-label="Editar produto">✎</button>' +
        '<button class="botao-icone" data-del-produto="' + produto.id_tenis + '" aria-label="Excluir produto">🗑</button>' +
      '</td>' +
    '</tr>';
  }

  async function carregarProdutos() {
    var busca = document.getElementById('busca-produtos').value;
    var linhas = await chamarApi('/admin/produtos?busca=' + encodeURIComponent(busca));
    var tbody = document.getElementById('tbody-produtos');

    if (linhas.length) {
      tbody.innerHTML = linhas.map(linhaDeProduto).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6" class="admin-vazio">Nenhum produto encontrado.</td></tr>';
    }

    vincularAcoesDeProduto(linhas);
  }

  function opcaoSelecionada(condicao) {
    if (condicao) {
      return 'selected';
    }

    return '';
  }

  function formularioDeProduto(produto, catalogos) {
    var opcoesMarcas = catalogos.marcas.map(function (marca) {
      var selecionada = produto && produto.id_marca === marca.id_marca;
      return '<option value="' + marca.id_marca + '" ' + opcaoSelecionada(selecionada) + '>' + escaparHtml(marca.nome) + '</option>';
    }).join('');

    var opcoesCategorias = catalogos.categorias.map(function (categoria) {
      var selecionada = produto && produto.id_categoria === categoria.id_categoria;
      return '<option value="' + categoria.id_categoria + '" ' + opcaoSelecionada(selecionada) + '>' + escaparHtml(categoria.nome) + '</option>';
    }).join('');

    var opcoesLojas = catalogos.lojas.map(function (loja) {
      var selecionada = produto && produto.id_loja === loja.id_loja;
      return '<option value="' + loja.id_loja + '" ' + opcaoSelecionada(selecionada) + '>' + escaparHtml(loja.nome) + '</option>';
    }).join('');

    var nome = '';
    var preco = '';
    var descricao = '';
    var status = '';

    if (produto) {
      nome = produto.nome;
      preco = produto.preco;
      descricao = produto.descricao;
      status = produto.status;
    }

    return '<form data-form-produto class="grade-form">' +
      '<div class="campo"><label for="adm-prod-nome">Nome</label><input id="adm-prod-nome" name="nome" required value="' + escaparHtml(nome || '') + '"></div>' +
      '<div class="campo"><label for="adm-prod-preco">Preço</label><input id="adm-prod-preco" name="preco" type="number" min="0" step="0.01" required value="' + escaparHtml(preco || '') + '"></div>' +
      '<div class="campo"><label for="adm-prod-marca">Marca</label><select id="adm-prod-marca" name="idMarca" required>' + opcoesMarcas + '</select></div>' +
      '<div class="campo"><label for="adm-prod-cat">Categoria</label><select id="adm-prod-cat" name="idCategoria" required>' + opcoesCategorias + '</select></div>' +
      '<div class="campo"><label for="adm-prod-loja">Loja</label><select id="adm-prod-loja" name="idLoja" required>' + opcoesLojas + '</select></div>' +
      '<div class="campo"><label for="adm-prod-status">Status</label><select id="adm-prod-status" name="status">' +
        '<option value="ativo" ' + opcaoSelecionada(status === 'ativo') + '>Ativo</option>' +
        '<option value="inativo" ' + opcaoSelecionada(status === 'inativo') + '>Inativo</option>' +
        '<option value="em_analise" ' + opcaoSelecionada(status === 'em_analise') + '>Em análise</option>' +
      '</select></div>' +
      '<div class="campo campo-largo"><label for="adm-prod-desc">Descrição</label><textarea id="adm-prod-desc" name="descricao">' + escaparHtml(descricao || '') + '</textarea></div>' +
      '<div class="admin-form-actions campo-largo"><button class="botao botao-branco" type="button" data-close>Cancelar</button><button class="botao botao-preto" type="submit">Salvar</button></div>' +
      '</form>';
  }

  async function editarProduto(produto) {
    var catalogos = await obterCatalogosDeApoio();

    var tituloModalProduto = 'Novo produto';

    if (produto) {
      tituloModalProduto = 'Editar produto';
    }

    abrirModal(tituloModalProduto, formularioDeProduto(produto, catalogos), function (dialogo) {
      dialogo.querySelector('[data-form-produto]').addEventListener('submit', async function (evento) {
        evento.preventDefault();

        var formulario = new FormData(evento.currentTarget);
        var payload = Object.fromEntries(formulario.entries());

        ['idMarca', 'idCategoria', 'idLoja'].forEach(function (campo) {
          payload[campo] = Number(payload[campo]);
        });
        payload.preco = Number(payload.preco);

        var alvo = caminhoEMetodo('/admin/produtos', produto && produto.id_tenis);
        await chamarApi(alvo.caminho, { method: alvo.metodo, body: JSON.stringify(payload) });

        Sola.fecharDialogo(dialogo);

        avisar(textoCriadoOuAtualizado(produto, 'Produto criado.', 'Produto atualizado.'));
        carregarProdutos();
        carregarResumo();
      });
    });
  }

  function vincularAcoesDeProduto(linhas) {
    document.querySelectorAll('[data-edit-produto]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var produto = linhas.find(function (item) {
          return String(item.id_tenis) === botao.dataset.editProduto;
        });
        editarProduto(produto);
      });
    });

    document.querySelectorAll('[data-del-produto]').forEach(function (botao) {
      botao.addEventListener('click', async function () {
        if (!confirm('Excluir este produto permanentemente?')) {
          return;
        }

        await chamarApi('/admin/produtos/' + botao.dataset.delProduto, { method: 'DELETE' });
        avisar('Produto excluído.');
        carregarProdutos();
        carregarResumo();
      });
    });
  }

  function linhaDeMarca(marca) {
    return '<tr>' +
      '<td class="celula-forte">' + escaparHtml(marca.nome) + '</td>' +
      '<td>' + marca.produtos + '</td>' +
      '<td class="acoes-linha">' +
        '<button class="botao-icone" data-edit-marca="' + marca.id_marca + '" aria-label="Editar marca">✎</button>' +
        '<button class="botao-icone" data-del-marca="' + marca.id_marca + '" aria-label="Excluir marca">🗑</button>' +
      '</td>' +
    '</tr>';
  }

  async function carregarMarcas() {
    var linhas = await chamarApi('/admin/marcas');
    var tbody = document.getElementById('tbody-marcas');

    if (linhas.length) {
      tbody.innerHTML = linhas.map(linhaDeMarca).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="3" class="admin-vazio">Nenhuma marca cadastrada.</td></tr>';
    }

    document.querySelectorAll('[data-edit-marca]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var marca = linhas.find(function (item) {
          return String(item.id_marca) === botao.dataset.editMarca;
        });
        editarMarca(marca);
      });
    });

    document.querySelectorAll('[data-del-marca]').forEach(function (botao) {
      botao.addEventListener('click', async function () {
        if (!confirm('Excluir esta marca?')) {
          return;
        }

        await chamarApi('/admin/marcas/' + botao.dataset.delMarca, { method: 'DELETE' });
        avisar('Marca excluída.');
        carregarMarcas();
        carregarResumo();
      });
    });
  }

  function editarMarca(marca) {
    var nome = '';

    if (marca) {
      nome = marca.nome;
    }

    var formulario =
      '<form data-form-marca>' +
        '<div class="campo"><label for="adm-marca-nome">Nome</label><input id="adm-marca-nome" name="nome" required value="' + escaparHtml(nome || '') + '"></div>' +
        '<div class="admin-form-actions"><button class="botao botao-branco" type="button" data-close>Cancelar</button><button class="botao botao-preto" type="submit">Salvar</button></div>' +
      '</form>';

    var tituloModalMarca = 'Nova marca';

    if (marca) {
      tituloModalMarca = 'Editar marca';
    }

    abrirModal(tituloModalMarca, formulario, function (dialogo) {
      dialogo.querySelector('[data-form-marca]').addEventListener('submit', async function (evento) {
        evento.preventDefault();

        var nomeDigitado = new FormData(evento.currentTarget).get('nome');
        var alvo = caminhoEMetodo('/admin/marcas', marca && marca.id_marca);
        await chamarApi(alvo.caminho, { method: alvo.metodo, body: JSON.stringify({ nome: nomeDigitado }) });

        Sola.fecharDialogo(dialogo);

        avisar(textoCriadoOuAtualizado(marca, 'Marca criada.', 'Marca atualizada.'));
        carregarMarcas();
        carregarResumo();
        cache.catalogos = null;
      });
    });
  }

  function linhaDeUsuario(usuario) {
    return '<tr>' +
      '<td class="celula-forte">' + escaparHtml(usuario.nome) + '</td>' +
      '<td class="apagado">' + escaparHtml(usuario.email) + '</td>' +
      '<td><span class="etiqueta etiqueta-cinza">' + escaparHtml(usuario.tipo) + '</span></td>' +
      '<td class="acoes-linha">' +
        '<button class="botao-icone" data-edit-user="' + usuario.id_usuario + '" aria-label="Editar usuário">✎</button>' +
        '<button class="botao-icone" data-del-user="' + usuario.id_usuario + '" aria-label="Excluir usuário">🗑</button>' +
      '</td>' +
    '</tr>';
  }

  async function carregarUsuarios() {
    var busca = document.getElementById('busca-usuarios').value;
    var tipo = document.getElementById('filtro-usuario').value;
    var caminho = '/admin/usuarios?busca=' + encodeURIComponent(busca);

    if (tipo) {
      caminho += '&tipo=' + encodeURIComponent(tipo);
    }

    var linhas = await chamarApi(caminho);
    var tbody = document.getElementById('tbody-usuarios');

    if (linhas.length) {
      tbody.innerHTML = linhas.map(linhaDeUsuario).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="4" class="admin-vazio">Nenhum usuário encontrado.</td></tr>';
    }

    document.querySelectorAll('[data-edit-user]').forEach(function (botao) {
      botao.addEventListener('click', function () {
        var usuario = linhas.find(function (item) {
          return String(item.id_usuario) === botao.dataset.editUser;
        });
        editarUsuario(usuario);
      });
    });

    document.querySelectorAll('[data-del-user]').forEach(function (botao) {
      botao.addEventListener('click', async function () {
        if (!confirm('Excluir este usuário? Esta operação depende das regras de integridade do banco.')) {
          return;
        }

        await chamarApi('/admin/usuarios/' + botao.dataset.delUser, { method: 'DELETE' });
        avisar('Usuário excluído.');
        carregarUsuarios();
        carregarResumo();
      });
    });
  }

  function editarUsuario(usuario) {
    var nome = '';
    var email = '';
    var tipo = '';

    if (usuario) {
      nome = usuario.nome;
      email = usuario.email;
      tipo = usuario.tipo;
    }

    var campoSenha = '';

    if (!usuario) {
      campoSenha = '<div class="campo"><label for="adm-user-senha">Senha inicial</label><input id="adm-user-senha" name="senha" type="password" minlength="8" required></div>';
    }

    var formulario = '<form data-form-usuario class="grade-form">' +
      '<div class="campo"><label for="adm-user-nome">Nome</label><input id="adm-user-nome" name="nome" required value="' + escaparHtml(nome || '') + '"></div>' +
      '<div class="campo"><label for="adm-user-email">E-mail</label><input id="adm-user-email" name="email" type="email" required value="' + escaparHtml(email || '') + '"></div>' +
      campoSenha +
      '<div class="campo"><label for="adm-user-tipo">Papel</label><select id="adm-user-tipo" name="tipo">' +
        '<option value="cliente" ' + opcaoSelecionada(tipo === 'cliente') + '>Cliente</option>' +
        '<option value="vendedor" ' + opcaoSelecionada(tipo === 'vendedor') + '>Vendedor</option>' +
        '<option value="admin" ' + opcaoSelecionada(tipo === 'admin') + '>Administrador</option>' +
      '</select></div>' +
      '<div class="admin-form-actions campo-largo"><button class="botao botao-branco" type="button" data-close>Cancelar</button><button class="botao botao-preto" type="submit">Salvar</button></div>' +
    '</form>';

    var tituloModalUsuario = 'Novo usuário';

    if (usuario) {
      tituloModalUsuario = 'Editar usuário';
    }

    abrirModal(tituloModalUsuario, formulario, function (dialogo) {
      dialogo.querySelector('[data-form-usuario]').addEventListener('submit', async function (evento) {
        evento.preventDefault();

        var payload = Object.fromEntries(new FormData(evento.currentTarget).entries());
        var alvo = caminhoEMetodo('/admin/usuarios', usuario && usuario.id_usuario);
        await chamarApi(alvo.caminho, { method: alvo.metodo, body: JSON.stringify(payload) });

        Sola.fecharDialogo(dialogo);

        avisar(textoCriadoOuAtualizado(usuario, 'Usuário criado.', 'Usuário atualizado.'));
        carregarUsuarios();
        carregarResumo();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!garantirAdmin()) {
      return;
    }

    document.querySelectorAll('.admin-aba').forEach(function (botao) {
      botao.addEventListener('click', function () {
        ativarSecao(botao.dataset.section);
      });
    });

    document.getElementById('busca-produtos').addEventListener('input', function () {
      clearTimeout(window.__buscaProdutosTimer);
      window.__buscaProdutosTimer = setTimeout(carregarProdutos, 250);
    });

    document.getElementById('busca-usuarios').addEventListener('input', function () {
      clearTimeout(window.__buscaUsuariosTimer);
      window.__buscaUsuariosTimer = setTimeout(carregarUsuarios, 250);
    });

    document.getElementById('filtro-usuario').addEventListener('change', carregarUsuarios);

    document.getElementById('novo-produto').addEventListener('click', function () {
      editarProduto(null);
    });

    document.getElementById('nova-marca').addEventListener('click', function () {
      editarMarca(null);
    });

    document.getElementById('novo-usuario').addEventListener('click', function () {
      editarUsuario(null);
    });

    carregarResumo().catch(function () {});
    ativarSecao('produtos');
  });
})();
