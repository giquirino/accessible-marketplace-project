
import { Router } from 'express';
import { autenticar, permitir, gerarHash } from './auth.js';

const router = Router();
router.use(autenticar, permitir('admin'));

function inteiro(valor, nome) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) throw Object.assign(new Error(`${nome} inválido.`), { status: 400 });
  return numero;
}
function texto(valor, nome, minimo = 1) {
  const resultado = String(valor ?? '').trim();
  if (resultado.length < minimo) throw Object.assign(new Error(`${nome} é obrigatório.`), { status: 400 });
  return resultado;
}
function preco(valor) {
  const resultado = Number(valor);
  if (!Number.isFinite(resultado) || resultado < 0) throw Object.assign(new Error('Preço inválido.'), { status: 400 });
  return resultado;
}
function pagina(req) {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  return { limit, offset };
}

router.get('/resumo', async (_req, res, next) => {
  try {
    const [usuarios, marcas, produtos] = await Promise.all([
      reqDb(_req).query('SELECT COUNT(*)::int AS total FROM usuarios'),
      reqDb(_req).query('SELECT COUNT(*)::int AS total FROM marcas'),
      reqDb(_req).query('SELECT COUNT(*)::int AS total FROM tenis')
    ]);
    res.json({ usuarios: usuarios.rows[0].total, marcas: marcas.rows[0].total, produtos: produtos.rows[0].total });
  } catch (e) { next(e); }
});

router.get('/catalogos', async (_req, res, next) => {
  try {
    const db = reqDb(_req);
    const [marcas, categorias, lojas] = await Promise.all([
      db.query('SELECT id_marca, nome FROM marcas ORDER BY nome ASC'),
      db.query('SELECT id_categoria, nome FROM categorias ORDER BY nome ASC'),
      db.query('SELECT id_loja, nome FROM lojas ORDER BY nome ASC')
    ]);
    res.json({ marcas: marcas.rows, categorias: categorias.rows, lojas: lojas.rows });
  } catch (e) { next(e); }
});

router.get('/produtos', async (req, res, next) => {
  try {
    const db = reqDb(req), { limit, offset } = pagina(req);
    const busca = String(req.query.busca || '').trim();
    const termo = `%${busca.replace(/([\\%_])/g, '\\$1')}%`;
    const { rows } = await db.query(`
      SELECT t.id_tenis, t.nome, t.descricao, t.preco, t.status,
             t.fk_id_marca AS id_marca, m.nome AS marca,
             t.fk_id_categoria AS id_categoria, c.nome AS categoria,
             t.fk_id_loja AS id_loja, l.nome AS loja
      FROM tenis t
      JOIN marcas m ON m.id_marca=t.fk_id_marca
      JOIN categorias c ON c.id_categoria=t.fk_id_categoria
      JOIN lojas l ON l.id_loja=t.fk_id_loja
      WHERE t.nome ILIKE $1 ESCAPE '\\'
      ORDER BY t.id_tenis DESC
      LIMIT $2 OFFSET $3`, [termo, limit, offset]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/produtos', async (req, res, next) => {
  try {
    const db = reqDb(req);
    const nome = texto(req.body.nome, 'Nome');
    const descricao = req.body.descricao == null ? null : String(req.body.descricao).trim() || null;
    const valor = preco(req.body.preco);
    const idMarca = inteiro(req.body.idMarca, 'Marca');
    const idCategoria = inteiro(req.body.idCategoria, 'Categoria');
    const idLoja = inteiro(req.body.idLoja, 'Loja');
    const status = ['ativo', 'inativo', 'em_analise'].includes(req.body.status) ? req.body.status : 'ativo';

    const { rows } = await db.query(`
      INSERT INTO tenis (fk_id_loja, fk_id_categoria, fk_id_marca, nome, descricao, preco, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id_tenis,nome,descricao,preco,status,fk_id_marca AS id_marca,fk_id_categoria AS id_categoria,fk_id_loja AS id_loja`,
      [idLoja, idCategoria, idMarca, nome, descricao, valor, status]);
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

router.put('/produtos/:id', async (req, res, next) => {
  try {
    const db = reqDb(req);
    const id = inteiro(req.params.id, 'Produto');
    const nome = texto(req.body.nome, 'Nome');
    const descricao = req.body.descricao == null ? null : String(req.body.descricao).trim() || null;
    const valor = preco(req.body.preco);
    const idMarca = inteiro(req.body.idMarca, 'Marca');
    const idCategoria = inteiro(req.body.idCategoria, 'Categoria');
    const idLoja = inteiro(req.body.idLoja, 'Loja');
    const status = ['ativo', 'inativo', 'em_analise'].includes(req.body.status) ? req.body.status : 'ativo';

    const { rows } = await db.query(`
      UPDATE tenis
      SET nome=$1, descricao=$2, preco=$3, fk_id_marca=$4, fk_id_categoria=$5, fk_id_loja=$6, status=$7
      WHERE id_tenis=$8
      RETURNING id_tenis,nome,descricao,preco,status,fk_id_marca AS id_marca,fk_id_categoria AS id_categoria,fk_id_loja AS id_loja`,
      [nome, descricao, valor, idMarca, idCategoria, idLoja, status, id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Produto não encontrado.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/produtos/:id', async (req, res, next) => {
  try {
    const db = reqDb(req), id = inteiro(req.params.id, 'Produto');
    const result = await db.query('DELETE FROM tenis WHERE id_tenis=$1', [id]);
    if (!result.rowCount) return res.status(404).json({ erro: 'Produto não encontrado.' });
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/marcas', async (req, res, next) => {
  try {
    const db = reqDb(req);
    const { rows } = await db.query(`
      SELECT m.id_marca, m.nome,
             COUNT(t.id_tenis)::int AS produtos
      FROM marcas m
      LEFT JOIN tenis t ON t.fk_id_marca=m.id_marca
      GROUP BY m.id_marca, m.nome
      ORDER BY m.nome ASC`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/marcas', async (req, res, next) => {
  try {
    const db = reqDb(req), nome = texto(req.body.nome, 'Nome da marca');
    const { rows } = await db.query('INSERT INTO marcas (nome) VALUES ($1) RETURNING id_marca,nome', [nome]);
    res.status(201).json({ ...rows[0], produtos: 0 });
  } catch (e) { next(e); }
});

router.put('/marcas/:id', async (req, res, next) => {
  try {
    const db = reqDb(req), id = inteiro(req.params.id, 'Marca'), nome = texto(req.body.nome, 'Nome da marca');
    const { rows } = await db.query('UPDATE marcas SET nome=$1 WHERE id_marca=$2 RETURNING id_marca,nome', [nome, id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Marca não encontrada.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/marcas/:id', async (req, res, next) => {
  try {
    const db = reqDb(req), id = inteiro(req.params.id, 'Marca');
    const usados = await db.query('SELECT COUNT(*)::int AS total FROM tenis WHERE fk_id_marca=$1', [id]);
    if (usados.rows[0].total > 0) return res.status(409).json({ erro: 'Não é possível excluir uma marca que possui produtos. Edite ou remova os produtos primeiro.' });
    const result = await db.query('DELETE FROM marcas WHERE id_marca=$1', [id]);
    if (!result.rowCount) return res.status(404).json({ erro: 'Marca não encontrada.' });
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/usuarios', async (req, res, next) => {
  try {
    const db = reqDb(req), { limit, offset } = pagina(req);
    const busca = String(req.query.busca || '').trim();
    const filtroTipo = ['cliente','vendedor','admin'].includes(req.query.tipo) ? req.query.tipo : null;
    const termo = `%${busca.replace(/([\\%_])/g, '\\$1')}%`;
    const { rows } = await db.query(`
      SELECT id_usuario,nome,email,tipo,foto_perfil
      FROM usuarios
      WHERE (nome ILIKE $1 ESCAPE '\\' OR email ILIKE $1 ESCAPE '\\')
        AND ($2::text IS NULL OR tipo=$2)
      ORDER BY id_usuario DESC
      LIMIT $3 OFFSET $4`, [termo, filtroTipo, limit, offset]);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/usuarios', async (req, res, next) => {
  try {
    const db = reqDb(req);
    const nome = texto(req.body.nome, 'Nome');
    const email = texto(req.body.email, 'E-mail').toLowerCase();
    const senha = texto(req.body.senha, 'Senha', 8);
    const tipo = ['cliente','vendedor','admin'].includes(req.body.tipo) ? req.body.tipo : 'cliente';
    const hash = await gerarHash(senha);
    const result = await db.query(
      'INSERT INTO usuarios (nome,email,senha,tipo) VALUES ($1,$2,$3,$4) RETURNING id_usuario,nome,email,tipo,foto_perfil',
      [nome, email, hash, tipo]
    );
    if (tipo === 'cliente') await db.query('INSERT INTO carrinhos (fk_id_usuario) VALUES ($1) ON CONFLICT DO NOTHING', [result.rows[0].id_usuario]);
    res.status(201).json(result.rows[0]);
  } catch (e) { next(e); }
});

router.put('/usuarios/:id', async (req, res, next) => {
  try {
    const db = reqDb(req), id = inteiro(req.params.id, 'Usuário'), nome = texto(req.body.nome, 'Nome');
    const email = texto(req.body.email, 'E-mail').toLowerCase();
    const tipo = ['cliente','vendedor','admin'].includes(req.body.tipo) ? req.body.tipo : 'cliente';
    const { rows } = await db.query(
      'UPDATE usuarios SET nome=$1,email=$2,tipo=$3 WHERE id_usuario=$4 RETURNING id_usuario,nome,email,tipo,foto_perfil',
      [nome, email, tipo, id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/usuarios/:id', async (req, res, next) => {
  try {
    const db = reqDb(req), id = inteiro(req.params.id, 'Usuário');
    if (id === req.usuario.id) return res.status(409).json({ erro: 'Você não pode excluir a própria conta de administrador.' });
    const result = await db.query('DELETE FROM usuarios WHERE id_usuario=$1', [id]);
    if (!result.rowCount) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    res.status(204).end();
  } catch (e) { next(e); }
});

function reqDb(req) {
  if (!req.app.locals.adminPool) throw Object.assign(new Error('Conexão de banco não configurada para o módulo administrativo.'), { status: 500 });
  return req.app.locals.adminPool;
}

export default router;
