import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pool, transaction } from './db.js';
import { config } from './config.js';
import { autenticar, permitir, criarToken, gerarHash, compararSenha } from './auth.js';
import { validar, schemas } from './validation.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));

app.get('/api/saude', async (_req, res, next) => { try { await pool.query('SELECT 1'); res.json({ status: 'ok' }); } catch (e) { next(e); } });

app.post('/api/auth/cadastro', validar(schemas.cadastro), async (req, res, next) => {
  try {
    const { nome, email, senha, tipo } = req.validado.body;
    const hash = await gerarHash(senha);
    const { rows } = await pool.query('INSERT INTO usuarios (nome,email,senha,tipo) VALUES ($1,$2,$3,$4) RETURNING id_usuario,nome,email,tipo', [nome, email.toLowerCase(), hash, tipo]);
    const usuario = rows[0];
    await pool.query('INSERT INTO carrinhos (fk_id_usuario) VALUES ($1)', [usuario.id_usuario]);
    res.status(201).json({ usuario, token: criarToken(usuario) });
  } catch (e) { if (e.code === '23505') return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' }); next(e); }
});

app.post('/api/auth/login', validar(schemas.login), async (req, res, next) => {
  try {
    const { email, senha } = req.validado.body;
    const { rows } = await pool.query('SELECT id_usuario,nome,email,senha,tipo FROM usuarios WHERE email=$1', [email.toLowerCase()]);
    const usuario = rows[0];
    if (!usuario || !(await compararSenha(senha, usuario.senha))) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    delete usuario.senha;
    res.json({ usuario, token: criarToken(usuario) });
  } catch (e) { next(e); }
});

app.get('/api/tenis', async (req, res, next) => {
  try {
    const { busca = '', marca, categoria } = req.query;
    const { rows } = await pool.query(`SELECT t.id_tenis,t.nome,t.descricao,t.preco,t.status,m.nome AS marca,c.nome AS categoria,l.nome AS loja,
      COALESCE(json_agg(DISTINCT f.url) FILTER (WHERE f.url IS NOT NULL), '[]') AS fotos
      FROM tenis t JOIN marcas m ON m.id_marca=t.fk_id_marca JOIN categorias c ON c.id_categoria=t.fk_id_categoria JOIN lojas l ON l.id_loja=t.fk_id_loja
      LEFT JOIN fotos_tenis f ON f.fk_id_tenis=t.id_tenis WHERE t.status='ativo' AND t.nome ILIKE $1
      AND ($2::bigint IS NULL OR t.fk_id_marca=$2) AND ($3::bigint IS NULL OR t.fk_id_categoria=$3)
      GROUP BY t.id_tenis,m.nome,c.nome,l.nome ORDER BY t.id_tenis DESC LIMIT 50`, [`%${busca}%`, marca || null, categoria || null]);
    res.json(rows);
  } catch (e) { next(e); }
});

app.post('/api/tenis', autenticar, permitir('vendedor'), validar(schemas.produto), async (req, res, next) => {
  try {
    const p = req.validado.body;
    const loja = await pool.query('SELECT id_loja FROM lojas WHERE fk_id_usuario=$1', [req.usuario.id]);
    if (!loja.rows[0]) return res.status(409).json({ erro: 'Crie os dados da loja antes de cadastrar produtos.' });
    const { rows } = await pool.query('INSERT INTO tenis (fk_id_loja,fk_id_categoria,fk_id_marca,nome,descricao,preco,status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [loja.rows[0].id_loja,p.idCategoria,p.idMarca,p.nome,p.descricao || null,p.preco,p.status]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

app.get('/api/carrinho', autenticar, async (req, res, next) => {
  try { const { rows } = await pool.query(`SELECT ic.id_item_carrinho,ic.quantidade,es.id_em_estoque,es.tamanho,es.cor,t.nome,t.preco,(ic.quantidade*t.preco) AS subtotal FROM carrinhos c JOIN itens_carrinhos ic ON ic.fk_id_carrinho=c.id_carrinho JOIN em_estoque es ON es.id_em_estoque=ic.fk_id_em_estoque JOIN tenis t ON t.id_tenis=es.fk_id_tenis WHERE c.fk_id_usuario=$1`, [req.usuario.id]); res.json(rows); } catch (e) { next(e); }
});

app.post('/api/carrinho/itens', autenticar, validar(schemas.itemCarrinho), async (req, res, next) => {
  try { const { idEstoque, quantidade } = req.validado.body; await pool.query(`INSERT INTO itens_carrinhos (fk_id_carrinho,fk_id_em_estoque,quantidade) SELECT id_carrinho,$2,$3 FROM carrinhos WHERE fk_id_usuario=$1 ON CONFLICT (fk_id_carrinho,fk_id_em_estoque) DO UPDATE SET quantidade=EXCLUDED.quantidade`, [req.usuario.id,idEstoque,quantidade]); res.status(204).end(); } catch (e) { next(e); }
});

app.post('/api/pedidos/finalizar', autenticar, permitir('cliente'), async (req, res, next) => {
  try {
    const pedido = await transaction(async (client) => {
      const itens = await client.query(`SELECT ic.fk_id_em_estoque,ic.quantidade,es.quantidade AS disponivel,t.preco FROM carrinhos c JOIN itens_carrinhos ic ON ic.fk_id_carrinho=c.id_carrinho JOIN em_estoque es ON es.id_em_estoque=ic.fk_id_em_estoque JOIN tenis t ON t.id_tenis=es.fk_id_tenis WHERE c.fk_id_usuario=$1 FOR UPDATE OF es`, [req.usuario.id]);
      if (!itens.rows.length) throw Object.assign(new Error('Carrinho vazio.'), { status: 409 });
      if (itens.rows.some(i => i.quantidade > i.disponivel)) throw Object.assign(new Error('Há itens sem estoque suficiente.'), { status: 409 });
      const total = itens.rows.reduce((sum, i) => sum + Number(i.preco) * i.quantidade, 0);
      const novo = await client.query("INSERT INTO pedidos (fk_id_usuario,valor_total,status) VALUES ($1,$2,'pendente') RETURNING *", [req.usuario.id,total]);
      for (const i of itens.rows) { await client.query('INSERT INTO itens_pedidos (fk_id_pedido,fk_id_em_estoque,quantidade,preco_unitario) VALUES ($1,$2,$3,$4)', [novo.rows[0].id_pedido,i.fk_id_em_estoque,i.quantidade,i.preco]); await client.query('UPDATE em_estoque SET quantidade=quantidade-$1 WHERE id_em_estoque=$2', [i.quantidade,i.fk_id_em_estoque]); }
      await client.query('DELETE FROM itens_carrinhos WHERE fk_id_carrinho=(SELECT id_carrinho FROM carrinhos WHERE fk_id_usuario=$1)', [req.usuario.id]);
      return novo.rows[0];
    });
    res.status(201).json(pedido);
  } catch (e) { next(e); }
});

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ erro: err.status ? err.message : 'Erro interno no servidor.' }); });
app.listen(config.port, () => console.log(`API disponível em http://localhost:${config.port}`));
