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
app.use(cors({ origin(origin, callback) {
  if (!origin || origensPermitidas.has(origin.replace(/\/$/, ''))) return callback(null, true);
  callback(Object.assign(new Error('Origem não permitida pelo CORS.'), { status: 403 }));
} }));

const jsonPadrao = express.json({ limit: '100kb' });
const jsonFoto = express.json({ limit: '300kb' });

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/imagens', rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));

app.get('/api/saude', async (_req, res, next) => { try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); } catch (e) { next(e); } });

const cacheImagens = new Map();
const CACHE_TTL = 60 * 60 * 1000;
function lerCache(chave) {
  const item = cacheImagens.get(chave);
  if (!item) return null;
  if (Date.now() - item.gravadoEm > CACHE_TTL) { cacheImagens.delete(chave); return null; }
  return item.valor;
}
function gravarCache(chave, valor) {
  if (cacheImagens.size > 200) cacheImagens.delete(cacheImagens.keys().next().value);
  cacheImagens.set(chave, { valor, gravadoEm: Date.now() });
}

const escolherEstavel = (lista, semente) => {
  if (!lista.length) return null;
  const soma = [...semente].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  return lista[Math.abs(soma) % lista.length];
};

app.get('/api/imagens/tenis', validar(schemas.imagens), async (req, res, next) => {
  try {
    const busca = (req.validado.query.q || 'running sneakers').slice(0, 80);
    const categoria = (req.validado.query.categoria || '').toLowerCase();
    const consultasPorCategoria = {
      corrida: 'running sneakers shoe', casual: 'casual sneakers shoe', basquete: 'basketball sneakers shoe',
      skate: 'skateboarding sneakers shoe', caminhada: 'walking sneakers shoe', trilha: 'hiking shoes'
    };
    const chaveCategoria = Object.keys(consultasPorCategoria).find((chave) => categoria.includes(chave));
    const consulta = consultasPorCategoria[chaveCategoria] || 'closed toe sneakers shoe';

    const chaveCache = `${consulta}|${busca}`;
    const emCache = lerCache(chaveCache);
    if (emCache) return res.json(emCache);

    if (config.pexelsApiKey) {
      const resposta = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(consulta)}&per_page=10&orientation=landscape`, {
        headers: { Authorization: config.pexelsApiKey }
      });
      if (resposta.ok) {
        const dados = await resposta.json();
        const foto = escolherEstavel(dados.photos || [], busca);
        if (foto) {
          const resultado = { url: foto.src.large, alt: foto.alt || busca, autor: foto.photographer, pagina: foto.url, fonte: 'Pexels' };
          gravarCache(chaveCache, resultado);
          return res.json(resultado);
        }
      }
    }

    const parametros = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: consulta, gsrnamespace: '6', gsrlimit: '10', prop: 'imageinfo', iiprop: 'url', iiurlwidth: '800', origin: '*' });
    const resposta = await fetch(`https://commons.wikimedia.org/w/api.php?${parametros}`, { headers: { 'User-Agent': 'LastDanceClub/1.0 (catalog image search)' } });
    if (!resposta.ok) return res.status(502).json({ erro: 'Não foi possível obter imagens.' });
    const dados = await resposta.json();
    const paginas = Object.values(dados.query?.pages || {}).filter((item) => item.imageinfo?.[0]?.thumburl || item.imageinfo?.[0]?.url);
    const pagina = escolherEstavel(paginas, busca);
    const imagem = pagina?.imageinfo?.[0];
    if (!imagem) return res.status(404).json({ erro: 'Nenhuma imagem encontrada.' });
    const resultado = {
      url: imagem.thumburl || imagem.url,
      alt: pagina.title.replace(/^File:/, ''),
      autor: 'Wikimedia Commons',
      pagina: imagem.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(pagina.title.replace(/ /g, '_'))}`,
      fonte: 'Wikimedia Commons'
    };
    gravarCache(chaveCache, resultado);
    res.json(resultado);
  } catch (e) { next(e); }
});

app.post('/api/auth/cadastro', jsonPadrao, validar(schemas.cadastro), async (req, res, next) => {
  try {
    const { nome, email, senha, tipo } = req.validado.body;
    const hash = await gerarHash(senha);
    const { rows } = await pool.query('INSERT INTO usuarios (nome,email,senha,tipo) VALUES ($1,$2,$3,$4) RETURNING id_usuario,nome,email,tipo,foto_perfil', [nome, email.toLowerCase(), hash, tipo]);
    const usuario = rows[0];
    await pool.query('INSERT INTO carrinhos (fk_id_usuario) VALUES ($1)', [usuario.id_usuario]);
    res.status(201).json({ usuario, token: criarToken(usuario) });
  } catch (e) { if (e.code === '23505') return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' }); next(e); }
});

app.post('/api/auth/login', jsonPadrao, validar(schemas.login), async (req, res, next) => {
  try {
    const { email, senha } = req.validado.body;
    const { rows } = await pool.query('SELECT id_usuario,nome,email,senha,tipo,foto_perfil FROM usuarios WHERE email=$1', [email.toLowerCase()]);
    const usuario = rows[0];
    if (!usuario || !(await compararSenha(senha, usuario.senha))) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    delete usuario.senha;
    res.json({ usuario, token: criarToken(usuario) });
  } catch (e) { next(e); }
});

app.get('/api/perfil', autenticar, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id_usuario,nome,email,tipo,foto_perfil FROM usuarios WHERE id_usuario=$1', [req.usuario.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

app.put('/api/perfil/foto', jsonFoto, autenticar, validar(schemas.foto), async (req, res, next) => {
  try {
    const { rows } = await pool.query('UPDATE usuarios SET foto_perfil=$1 WHERE id_usuario=$2 RETURNING id_usuario,nome,email,tipo,foto_perfil', [req.validado.body.foto, req.usuario.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

app.delete('/api/perfil/foto', autenticar, async (req, res, next) => {
  try {
    await pool.query('UPDATE usuarios SET foto_perfil=NULL WHERE id_usuario=$1', [req.usuario.id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

app.get('/api/lojas/minha', autenticar, permitir('vendedor'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id_loja,nome,descricao,logo FROM lojas WHERE fk_id_usuario=$1', [req.usuario.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Nenhuma loja cadastrada para este vendedor.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

app.put('/api/lojas/logo', jsonFoto, autenticar, permitir('vendedor'), validar(schemas.logoLoja), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE lojas SET logo=$1 WHERE fk_id_usuario=$2 RETURNING id_loja,nome,descricao,logo',
      [req.validado.body.logo, req.usuario.id]
    );
    if (!rows[0]) return res.status(409).json({ erro: 'Crie os dados da loja antes de enviar a logo.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

app.delete('/api/lojas/logo', autenticar, permitir('vendedor'), async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('UPDATE lojas SET logo=NULL WHERE fk_id_usuario=$1', [req.usuario.id]);
    if (!rowCount) return res.status(409).json({ erro: 'Crie os dados da loja antes de remover a logo.' });
    res.status(204).end();
  } catch (e) { next(e); }
});

app.get('/api/tenis', validar(schemas.catalogo), async (req, res, next) => {
  try {
    const { busca = '', marca, categoria } = req.validado.query;
    const termo = `%${busca.replace(/([\\%_])/g, '\\$1')}%`;
    const { rows } = await pool.query(`SELECT t.id_tenis,t.nome,t.descricao,t.preco,t.status,m.nome AS marca,c.nome AS categoria,l.nome AS loja,
      COALESCE(json_agg(DISTINCT f.url) FILTER (WHERE f.url IS NOT NULL), '[]') AS fotos,
      MIN(es.id_em_estoque) FILTER (WHERE es.quantidade > 0) AS id_estoque
      FROM tenis t JOIN marcas m ON m.id_marca=t.fk_id_marca JOIN categorias c ON c.id_categoria=t.fk_id_categoria JOIN lojas l ON l.id_loja=t.fk_id_loja
      LEFT JOIN fotos_tenis f ON f.fk_id_tenis=t.id_tenis LEFT JOIN em_estoque es ON es.fk_id_tenis=t.id_tenis
      WHERE t.status='ativo' AND t.nome ILIKE $1 ESCAPE '\\'
      AND ($2::bigint IS NULL OR t.fk_id_marca=$2) AND ($3::bigint IS NULL OR t.fk_id_categoria=$3)
      GROUP BY t.id_tenis,m.nome,c.nome,l.nome ORDER BY t.id_tenis DESC LIMIT 50`, [termo, marca ?? null, categoria ?? null]);
    res.json(rows);
  } catch (e) { next(e); }
});

app.post('/api/tenis', jsonPadrao, autenticar, permitir('vendedor'), validar(schemas.produto), async (req, res, next) => {
  try {
    const p = req.validado.body;
    const loja = await pool.query('SELECT id_loja FROM lojas WHERE fk_id_usuario=$1', [req.usuario.id]);
    if (!loja.rows[0]) return res.status(409).json({ erro: 'Crie os dados da loja antes de cadastrar produtos.' });
    const { rows } = await pool.query("INSERT INTO tenis (fk_id_loja,fk_id_categoria,fk_id_marca,nome,descricao,preco,status) VALUES ($1,$2,$3,$4,$5,$6,'em_analise') RETURNING *", [loja.rows[0].id_loja, p.idCategoria, p.idMarca, p.nome, p.descricao || null, p.preco]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

app.get('/api/carrinho', autenticar, permitir('cliente'), async (req, res, next) => {
  try { const { rows } = await pool.query(`SELECT ic.id_item_carrinho,ic.quantidade,es.id_em_estoque,es.tamanho,es.cor,t.nome,t.preco,(ic.quantidade*t.preco) AS subtotal FROM carrinhos c JOIN itens_carrinhos ic ON ic.fk_id_carrinho=c.id_carrinho JOIN em_estoque es ON es.id_em_estoque=ic.fk_id_em_estoque JOIN tenis t ON t.id_tenis=es.fk_id_tenis WHERE c.fk_id_usuario=$1`, [req.usuario.id]); res.json(rows); } catch (e) { next(e); }
});

app.post('/api/carrinho/itens', jsonPadrao, autenticar, permitir('cliente'), validar(schemas.itemCarrinho), async (req, res, next) => {
  try { const { idEstoque, quantidade } = req.validado.body; await pool.query(`INSERT INTO itens_carrinhos (fk_id_carrinho,fk_id_em_estoque,quantidade) SELECT id_carrinho,$2,$3 FROM carrinhos WHERE fk_id_usuario=$1 ON CONFLICT (fk_id_carrinho,fk_id_em_estoque) DO UPDATE SET quantidade=EXCLUDED.quantidade`, [req.usuario.id, idEstoque, quantidade]); res.status(204).end(); } catch (e) { next(e); }
});

app.post('/api/pedidos/finalizar', autenticar, permitir('cliente'), async (req, res, next) => {
  try {
    const pedido = await transaction(async (client) => {
      const itens = await client.query(`SELECT ic.fk_id_em_estoque,ic.quantidade,es.quantidade AS disponivel,t.preco FROM carrinhos c JOIN itens_carrinhos ic ON ic.fk_id_carrinho=c.id_carrinho JOIN em_estoque es ON es.id_em_estoque=ic.fk_id_em_estoque JOIN tenis t ON t.id_tenis=es.fk_id_tenis WHERE c.fk_id_usuario=$1 FOR UPDATE OF es`, [req.usuario.id]);
      if (!itens.rows.length) throw Object.assign(new Error('Carrinho vazio.'), { status: 409 });
      if (itens.rows.some(i => i.quantidade > i.disponivel)) throw Object.assign(new Error('Há itens sem estoque suficiente.'), { status: 409 });
      const total = itens.rows.reduce((sum, i) => sum + Number(i.preco) * i.quantidade, 0);
      const novo = await client.query("INSERT INTO pedidos (fk_id_usuario,valor_total,status) VALUES ($1,$2,'pendente') RETURNING *", [req.usuario.id, total]);
      for (const i of itens.rows) { await client.query('INSERT INTO itens_pedidos (fk_id_pedido,fk_id_em_estoque,quantidade,preco_unitario) VALUES ($1,$2,$3,$4)', [novo.rows[0].id_pedido, i.fk_id_em_estoque, i.quantidade, i.preco]); await client.query('UPDATE em_estoque SET quantidade=quantidade-$1 WHERE id_em_estoque=$2', [i.quantidade, i.fk_id_em_estoque]); }
      await client.query('DELETE FROM itens_carrinhos WHERE fk_id_carrinho=(SELECT id_carrinho FROM carrinhos WHERE fk_id_usuario=$1)', [req.usuario.id]);
      return novo.rows[0];
    });
    res.status(201).json(pedido);
  } catch (e) { next(e); }
});

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.type === 'entity.too.large') return res.status(413).json({ erro: 'Conteúdo enviado é grande demais.' });
  res.status(err.status || 500).json({ erro: err.status ? err.message : 'Erro interno no servidor.' });
});

const servidor = app.listen(config.port, () => console.log(`API disponível em http://localhost:${config.port}`));

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    servidor.close(async () => { await pool.end(); process.exit(0); });
  });
}
