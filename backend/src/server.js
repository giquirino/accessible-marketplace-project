import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pool, transaction } from './db.js';
import { config } from './config.js';
import { autenticar, permitir, criarToken, gerarHash, compararSenha } from './auth.js';
import { validar, schemas } from './validation.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());

const origensPermitidas = new Set([
  ...config.origensPermitidas,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

app.use(cors({
  origin(origem, liberarOrigem) {
    if (!origem || origensPermitidas.has(origem.replace(/\/$/, ''))) {
      liberarOrigem(null, true);
      return;
    }

    liberarOrigem(Object.assign(new Error('Origem não permitida pelo CORS.'), { status: 403 }));
  }
}));

const jsonPadrao = express.json({ limit: '100kb' });
const jsonFoto = express.json({ limit: '300kb' });

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/imagens', rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));

app.get('/api/saude', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (erro) {
    next(erro);
  }
});

const cacheDeImagens = new Map();
const TEMPO_DE_VIDA_DO_CACHE = 60 * 60 * 1000;

function lerCache(chave) {
  const item = cacheDeImagens.get(chave);

  if (!item) {
    return null;
  }

  if (Date.now() - item.gravadoEm > TEMPO_DE_VIDA_DO_CACHE) {
    cacheDeImagens.delete(chave);
    return null;
  }

  return item.valor;
}

function gravarCache(chave, valor) {
  if (cacheDeImagens.size > 200) {
    cacheDeImagens.delete(cacheDeImagens.keys().next().value);
  }

  cacheDeImagens.set(chave, { valor, gravadoEm: Date.now() });
}

function escolherEstavel(lista, semente) {
  if (!lista.length) {
    return null;
  }

  const soma = [...semente].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  return lista[Math.abs(soma) % lista.length];
}

function primeiraImagemDaPaginaWiki(paginaWiki) {
  if (!paginaWiki || !paginaWiki.imageinfo) {
    return null;
  }

  return paginaWiki.imageinfo[0] || null;
}

app.get('/api/imagens/tenis', validar(schemas.imagens), async (req, res, next) => {
  try {
    const busca = (req.validado.query.q || 'running sneakers').slice(0, 80);
    const categoria = (req.validado.query.categoria || '').toLowerCase();

    const consultasPorCategoria = {
      corrida: 'running sneakers shoe',
      casual: 'casual sneakers shoe',
      basquete: 'basketball sneakers shoe',
      skate: 'skateboarding sneakers shoe',
      caminhada: 'walking sneakers shoe',
      trilha: 'hiking shoes'
    };

    const chaveCategoria = Object.keys(consultasPorCategoria).find((chave) => categoria.includes(chave));
    const consulta = consultasPorCategoria[chaveCategoria] || 'closed toe sneakers shoe';

    const chaveCache = `${consulta}|${busca}`;
    const emCache = lerCache(chaveCache);

    if (emCache) {
      res.json(emCache);
      return;
    }

    if (config.pexelsApiKey) {
      const respostaPexels = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(consulta)}&per_page=10&orientation=landscape`, {
        headers: { Authorization: config.pexelsApiKey }
      });

      if (respostaPexels.ok) {
        const dadosPexels = await respostaPexels.json();
        const foto = escolherEstavel(dadosPexels.photos || [], busca);

        if (foto) {
          const resultadoPexels = {
            url: foto.src.large,
            alt: foto.alt || busca,
            autor: foto.photographer,
            pagina: foto.url,
            fonte: 'Pexels'
          };
          gravarCache(chaveCache, resultadoPexels);
          res.json(resultadoPexels);
          return;
        }
      }
    }

    const parametrosWiki = new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: consulta,
      gsrnamespace: '6',
      gsrlimit: '10',
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: '800',
      origin: '*'
    });

    const respostaWiki = await fetch(`https://commons.wikimedia.org/w/api.php?${parametrosWiki}`, {
      headers: { 'User-Agent': 'LastDanceClub/1.0 (catalog image search)' }
    });

    if (!respostaWiki.ok) {
      res.status(502).json({ erro: 'Não foi possível obter imagens.' });
      return;
    }

    const dadosWiki = await respostaWiki.json();

    let paginasWiki = {};
    if (dadosWiki.query && dadosWiki.query.pages) {
      paginasWiki = dadosWiki.query.pages;
    }

    const paginasComImagem = Object.values(paginasWiki).filter((paginaWiki) => {
      const imagemInfo = primeiraImagemDaPaginaWiki(paginaWiki);

      if (!imagemInfo) {
        return false;
      }

      return Boolean(imagemInfo.thumburl || imagemInfo.url);
    });

    const paginaEscolhida = escolherEstavel(paginasComImagem, busca);
    const imagemEscolhida = primeiraImagemDaPaginaWiki(paginaEscolhida);

    if (!imagemEscolhida) {
      res.status(404).json({ erro: 'Nenhuma imagem encontrada.' });
      return;
    }

    const resultadoWiki = {
      url: imagemEscolhida.thumburl || imagemEscolhida.url,
      alt: paginaEscolhida.title.replace(/^File:/, ''),
      autor: 'Wikimedia Commons',
      pagina: imagemEscolhida.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(paginaEscolhida.title.replace(/ /g, '_'))}`,
      fonte: 'Wikimedia Commons'
    };

    gravarCache(chaveCache, resultadoWiki);
    res.json(resultadoWiki);
  } catch (erro) {
    next(erro);
  }
});

app.post('/api/auth/cadastro', jsonPadrao, validar(schemas.cadastro), async (req, res, next) => {
  try {
    const { nome, email, senha, tipo } = req.validado.body;
    const hash = await gerarHash(senha);

    const { rows } = await pool.query(
      'INSERT INTO usuarios (nome,email,senha,tipo) VALUES ($1,$2,$3,$4) RETURNING id_usuario,nome,email,tipo,foto_perfil',
      [nome, email.toLowerCase(), hash, tipo]
    );

    const usuario = rows[0];
    await pool.query('INSERT INTO carrinhos (fk_id_usuario) VALUES ($1)', [usuario.id_usuario]);
    res.status(201).json({ usuario, token: criarToken(usuario) });
  } catch (erro) {
    if (erro.code === '23505') {
      res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
      return;
    }
    next(erro);
  }
});

app.post('/api/auth/login', jsonPadrao, validar(schemas.login), async (req, res, next) => {
  try {
    const { email, senha } = req.validado.body;
    const { rows } = await pool.query('SELECT id_usuario,nome,email,senha,tipo,foto_perfil FROM usuarios WHERE email=$1', [email.toLowerCase()]);
    const usuario = rows[0];

    let senhaCorreta = false;
    if (usuario) {
      senhaCorreta = await compararSenha(senha, usuario.senha);
    }

    if (!usuario || !senhaCorreta) {
      res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
      return;
    }

    delete usuario.senha;
    res.json({ usuario, token: criarToken(usuario) });
  } catch (erro) {
    next(erro);
  }
});

app.get('/api/perfil', autenticar, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id_usuario,nome,email,tipo,foto_perfil FROM usuarios WHERE id_usuario=$1', [req.usuario.id]);

    if (!rows[0]) {
      res.status(404).json({ erro: 'Usuário não encontrado.' });
      return;
    }

    res.json(rows[0]);
  } catch (erro) {
    next(erro);
  }
});

app.put('/api/perfil', jsonPadrao, autenticar, validar(schemas.perfil), async (req, res, next) => {
  try {
    const { nome, email } = req.validado.body;

    const { rows } = await pool.query(
      'UPDATE usuarios SET nome=$1,email=$2 WHERE id_usuario=$3 RETURNING id_usuario,nome,email,tipo,foto_perfil',
      [nome, email.toLowerCase(), req.usuario.id]
    );

    if (!rows[0]) {
      res.status(404).json({ erro: 'Usuário não encontrado.' });
      return;
    }

    res.json(rows[0]);
  } catch (erro) {
    if (erro.code === '23505') {
      res.status(409).json({ erro: 'Este e-mail já está sendo usado por outra conta.' });
      return;
    }
    next(erro);
  }
});

app.put('/api/perfil/foto', jsonFoto, autenticar, validar(schemas.foto), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE usuarios SET foto_perfil=$1 WHERE id_usuario=$2 RETURNING id_usuario,nome,email,tipo,foto_perfil',
      [req.validado.body.foto, req.usuario.id]
    );

    if (!rows[0]) {
      res.status(404).json({ erro: 'Usuário não encontrado.' });
      return;
    }

    res.json(rows[0]);
  } catch (erro) {
    next(erro);
  }
});

app.delete('/api/perfil/foto', autenticar, async (req, res, next) => {
  try {
    await pool.query('UPDATE usuarios SET foto_perfil=NULL WHERE id_usuario=$1', [req.usuario.id]);
    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

app.get('/api/lojas/minha', autenticar, permitir('vendedor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id_loja,nome,descricao,logo FROM lojas WHERE fk_id_usuario=$1', [req.usuario.id]);

    if (!rows[0]) {
      res.status(404).json({ erro: 'Nenhuma loja cadastrada para este vendedor.' });
      return;
    }

    res.json(rows[0]);
  } catch (erro) {
    next(erro);
  }
});

app.put('/api/lojas/logo', jsonFoto, autenticar, permitir('vendedor'), validar(schemas.logoLoja), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE lojas SET logo=$1 WHERE fk_id_usuario=$2 RETURNING id_loja,nome,descricao,logo',
      [req.validado.body.logo, req.usuario.id]
    );

    if (!rows[0]) {
      res.status(409).json({ erro: 'Crie os dados da loja antes de enviar a logo.' });
      return;
    }

    res.json(rows[0]);
  } catch (erro) {
    next(erro);
  }
});

app.delete('/api/lojas/logo', autenticar, permitir('vendedor'), async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('UPDATE lojas SET logo=NULL WHERE fk_id_usuario=$1', [req.usuario.id]);

    if (!rowCount) {
      res.status(409).json({ erro: 'Crie os dados da loja antes de remover a logo.' });
      return;
    }

    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

app.get('/api/tenis', validar(schemas.catalogo), async (req, res, next) => {
  try {
    const { busca = '', marca, categoria } = req.validado.query;
    const termo = `%${busca.replace(/([\\%_])/g, '\\$1')}%`;

    const marcaFiltro = marca ?? null;
    const categoriaFiltro = categoria ?? null;

    const { rows } = await pool.query(`SELECT t.id_tenis,t.nome,t.descricao,t.preco,t.status,m.nome AS marca,c.nome AS categoria,l.nome AS loja,
      COALESCE(json_agg(DISTINCT f.url) FILTER (WHERE f.url IS NOT NULL), '[]') AS fotos,
      MIN(es.id_em_estoque) FILTER (WHERE es.quantidade > 0) AS id_estoque
      FROM tenis t JOIN marcas m ON m.id_marca=t.fk_id_marca JOIN categorias c ON c.id_categoria=t.fk_id_categoria JOIN lojas l ON l.id_loja=t.fk_id_loja
      LEFT JOIN fotos_tenis f ON f.fk_id_tenis=t.id_tenis LEFT JOIN em_estoque es ON es.fk_id_tenis=t.id_tenis
      WHERE t.status='ativo' AND t.nome ILIKE $1 ESCAPE '\\'
      AND ($2::bigint IS NULL OR t.fk_id_marca=$2) AND ($3::bigint IS NULL OR t.fk_id_categoria=$3)
      GROUP BY t.id_tenis,m.nome,c.nome,l.nome ORDER BY t.id_tenis DESC LIMIT 50`, [termo, marcaFiltro, categoriaFiltro]);

    res.json(rows);
  } catch (erro) {
    next(erro);
  }
});

app.post('/api/tenis', jsonPadrao, autenticar, permitir('vendedor'), validar(schemas.produto), async (req, res, next) => {
  try {
    const dadosDoProduto = req.validado.body;
    const loja = await pool.query('SELECT id_loja FROM lojas WHERE fk_id_usuario=$1', [req.usuario.id]);

    if (!loja.rows[0]) {
      res.status(409).json({ erro: 'Crie os dados da loja antes de cadastrar produtos.' });
      return;
    }

    const { rows } = await pool.query(
      "INSERT INTO tenis (fk_id_loja,fk_id_categoria,fk_id_marca,nome,descricao,preco,status) VALUES ($1,$2,$3,$4,$5,$6,'em_analise') RETURNING *",
      [loja.rows[0].id_loja, dadosDoProduto.idCategoria, dadosDoProduto.idMarca, dadosDoProduto.nome, dadosDoProduto.descricao || null, dadosDoProduto.preco]
    );

    res.status(201).json(rows[0]);
  } catch (erro) {
    next(erro);
  }
});

app.get('/api/carrinho', autenticar, permitir('cliente'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ic.id_item_carrinho,ic.quantidade,es.id_em_estoque,es.tamanho,es.cor,t.nome,t.preco,(ic.quantidade*t.preco) AS subtotal
       FROM carrinhos c JOIN itens_carrinhos ic ON ic.fk_id_carrinho=c.id_carrinho JOIN em_estoque es ON es.id_em_estoque=ic.fk_id_em_estoque JOIN tenis t ON t.id_tenis=es.fk_id_tenis
       WHERE c.fk_id_usuario=$1`,
      [req.usuario.id]
    );

    res.json(rows);
  } catch (erro) {
    next(erro);
  }
});

app.post('/api/carrinho/itens', jsonPadrao, autenticar, permitir('cliente'), validar(schemas.itemCarrinho), async (req, res, next) => {
  try {
    const { idEstoque, quantidade } = req.validado.body;

    await pool.query(
      `INSERT INTO itens_carrinhos (fk_id_carrinho,fk_id_em_estoque,quantidade)
       SELECT id_carrinho,$2,$3 FROM carrinhos WHERE fk_id_usuario=$1
       ON CONFLICT (fk_id_carrinho,fk_id_em_estoque) DO UPDATE SET quantidade=EXCLUDED.quantidade`,
      [req.usuario.id, idEstoque, quantidade]
    );

    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

app.delete('/api/carrinho/itens/:idItemCarrinho', autenticar, permitir('cliente'), validar(schemas.itemCarrinhoParam), async (req, res, next) => {
  try {
    const { idItemCarrinho } = req.validado.params;

    await pool.query(
      `DELETE FROM itens_carrinhos ic USING carrinhos c
       WHERE ic.id_item_carrinho=$1 AND ic.fk_id_carrinho=c.id_carrinho AND c.fk_id_usuario=$2`,
      [idItemCarrinho, req.usuario.id]
    );

    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

app.get('/api/favoritos', autenticar, permitir('cliente'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id_tenis,t.nome,t.preco,m.nome AS marca,c.nome AS categoria,
        COALESCE(json_agg(DISTINCT f.url) FILTER (WHERE f.url IS NOT NULL), '[]') AS fotos,
        MIN(es.id_em_estoque) FILTER (WHERE es.quantidade > 0) AS id_estoque
       FROM favoritos fav
       JOIN tenis t ON t.id_tenis=fav.fk_id_tenis
       JOIN marcas m ON m.id_marca=t.fk_id_marca
       JOIN categorias c ON c.id_categoria=t.fk_id_categoria
       LEFT JOIN fotos_tenis f ON f.fk_id_tenis=t.id_tenis
       LEFT JOIN em_estoque es ON es.fk_id_tenis=t.id_tenis
       WHERE fav.fk_id_usuario=$1
       GROUP BY t.id_tenis,m.nome,c.nome ORDER BY t.id_tenis DESC`,
      [req.usuario.id]
    );

    res.json(rows);
  } catch (erro) {
    next(erro);
  }
});

app.post('/api/favoritos', jsonPadrao, autenticar, permitir('cliente'), validar(schemas.favorito), async (req, res, next) => {
  try {
    const { idTenis } = req.validado.body;

    await pool.query(
      'INSERT INTO favoritos (fk_id_usuario,fk_id_tenis) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.usuario.id, idTenis]
    );

    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

app.delete('/api/favoritos/:idTenis', autenticar, permitir('cliente'), validar(schemas.favoritoParam), async (req, res, next) => {
  try {
    const { idTenis } = req.validado.params;

    await pool.query('DELETE FROM favoritos WHERE fk_id_usuario=$1 AND fk_id_tenis=$2', [req.usuario.id, idTenis]);

    res.status(204).end();
  } catch (erro) {
    next(erro);
  }
});

app.post('/api/pedidos/finalizar', autenticar, permitir('cliente'), async (req, res, next) => {
  try {
    const pedido = await transaction(async (conexao) => {
      const itens = await conexao.query(
        `SELECT ic.fk_id_em_estoque,ic.quantidade,es.quantidade AS disponivel,t.preco
         FROM carrinhos c JOIN itens_carrinhos ic ON ic.fk_id_carrinho=c.id_carrinho JOIN em_estoque es ON es.id_em_estoque=ic.fk_id_em_estoque JOIN tenis t ON t.id_tenis=es.fk_id_tenis
         WHERE c.fk_id_usuario=$1 FOR UPDATE OF es`,
        [req.usuario.id]
      );

      if (!itens.rows.length) {
        throw Object.assign(new Error('Carrinho vazio.'), { status: 409 });
      }

      const semEstoqueSuficiente = itens.rows.some((item) => item.quantidade > item.disponivel);
      if (semEstoqueSuficiente) {
        throw Object.assign(new Error('Há itens sem estoque suficiente.'), { status: 409 });
      }

      const total = itens.rows.reduce((acumulado, item) => acumulado + Number(item.preco) * item.quantidade, 0);

      const novoPedido = await conexao.query(
        "INSERT INTO pedidos (fk_id_usuario,valor_total,status) VALUES ($1,$2,'pendente') RETURNING *",
        [req.usuario.id, total]
      );

      for (const item of itens.rows) {
        await conexao.query(
          'INSERT INTO itens_pedidos (fk_id_pedido,fk_id_em_estoque,quantidade,preco_unitario) VALUES ($1,$2,$3,$4)',
          [novoPedido.rows[0].id_pedido, item.fk_id_em_estoque, item.quantidade, item.preco]
        );
        await conexao.query(
          'UPDATE em_estoque SET quantidade=quantidade-$1 WHERE id_em_estoque=$2',
          [item.quantidade, item.fk_id_em_estoque]
        );
      }

      await conexao.query(
        'DELETE FROM itens_carrinhos WHERE fk_id_carrinho=(SELECT id_carrinho FROM carrinhos WHERE fk_id_usuario=$1)',
        [req.usuario.id]
      );

      return novoPedido.rows[0];
    });

    res.status(201).json(pedido);
  } catch (erro) {
    next(erro);
  }
});

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use((erro, _req, res, _next) => {
  console.error(erro);

  if (erro.type === 'entity.too.large') {
    res.status(413).json({ erro: 'Conteúdo enviado é grande demais.' });
    return;
  }

  if (erro.status) {
    res.status(erro.status).json({ erro: erro.message });
  } else {
    res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
});

const servidor = app.listen(config.port, () => console.log(`API disponível em http://localhost:${config.port}`));

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    servidor.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}
