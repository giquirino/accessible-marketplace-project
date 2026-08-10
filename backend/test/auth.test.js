import test from 'node:test';
import assert from 'node:assert/strict';
import { respostaFalsa } from './apoio.js';

process.env.DATABASE_URL ??= 'postgresql://teste:teste@localhost:5432/teste';
process.env.JWT_SECRET ??= 'chave-de-teste-com-mais-de-32-caracteres-ok';

const { criarToken, autenticar, permitir, gerarHash, compararSenha } = await import('../src/auth.js');

test('senha é guardada como hash e confere na comparação', async () => {
  const hash = await gerarHash('senhaforte1');
  assert.notEqual(hash, 'senhaforte1');
  assert.equal(await compararSenha('senhaforte1', hash), true);
  assert.equal(await compararSenha('senhaerrada', hash), false);
});

test('token carrega id e tipo e é aceito pelo middleware', () => {
  const token = criarToken({ id_usuario: 42, tipo: 'vendedor', nome: 'Ana' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = respostaFalsa();
  let seguiu = false;
  autenticar(req, res, () => { seguiu = true; });
  assert.equal(seguiu, true);
  assert.equal(req.usuario.id, 42);
  assert.equal(req.usuario.tipo, 'vendedor');
});

test('token ausente ou adulterado devolve 401', () => {
  for (const headers of [{}, { authorization: 'Bearer abc.def.ghi' }]) {
    const res = respostaFalsa();
    let seguiu = false;
    autenticar({ headers }, res, () => { seguiu = true; });
    assert.equal(seguiu, false);
    assert.equal(res.codigo, 401);
  }
});

test('permitir bloqueia perfil errado com 403', () => {
  const res = respostaFalsa();
  let seguiu = false;
  permitir('vendedor')({ usuario: { tipo: 'cliente' } }, res, () => { seguiu = true; });
  assert.equal(seguiu, false);
  assert.equal(res.codigo, 403);
});

test('permitir devolve 401 quando usado sem autenticar antes', () => {
  const res = respostaFalsa();
  let seguiu = false;
  permitir('admin')({}, res, () => { seguiu = true; });
  assert.equal(seguiu, false);
  assert.equal(res.codigo, 401);
});
