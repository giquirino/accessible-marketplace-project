import test from 'node:test';
import assert from 'node:assert/strict';
import { schemas, validar } from '../src/validation.js';
import { respostaFalsa } from './apoio.js';

const analisar = (schema, entrada) => schema.safeParse({ body: {}, params: {}, query: {}, ...entrada });

test('cadastro recusa senha com menos de 8 caracteres', () => {
  const r = analisar(schemas.cadastro, { body: { nome: 'Ana Souza', email: 'a@b.com', senha: 'curta' } });
  assert.equal(r.success, false);
});

test('cadastro assume cliente quando o tipo não é informado', () => {
  const r = analisar(schemas.cadastro, { body: { nome: 'Ana Souza', email: 'a@b.com', senha: 'senhaforte1' } });
  assert.equal(r.success, true);
  assert.equal(r.data.body.tipo, 'cliente');
});

test('cadastro não aceita o tipo admin', () => {
  const r = analisar(schemas.cadastro, { body: { nome: 'Ana Souza', email: 'a@b.com', senha: 'senhaforte1', tipo: 'admin' } });
  assert.equal(r.success, false);
});

test('produto descarta o status enviado pelo cliente', () => {
  const r = analisar(schemas.produto, { body: { nome: 'Tênis X', preco: '10', idCategoria: '1', idMarca: '2', status: 'ativo' } });
  assert.equal(r.success, true);
  assert.equal(r.data.body.status, undefined);
});

test('catálogo converte marca e categoria em número', () => {
  const r = analisar(schemas.catalogo, { query: { busca: 'run', marca: '3', categoria: '7' } });
  assert.equal(r.success, true);
  assert.equal(r.data.query.marca, 3);
  assert.equal(r.data.query.categoria, 7);
});

test('catálogo recusa marca que não é número, em vez de deixar o Postgres falhar', () => {
  const r = analisar(schemas.catalogo, { query: { marca: 'abc' } });
  assert.equal(r.success, false);
});

test('catálogo trata filtro vazio como ausente', () => {
  const r = analisar(schemas.catalogo, { query: { marca: '', categoria: '' } });
  assert.equal(r.success, true);
  assert.equal(r.data.query.marca, undefined);
  assert.equal(r.data.query.categoria, undefined);
});

test('foto de perfil aceita apenas data URL de imagem', () => {
  assert.equal(analisar(schemas.foto, { body: { foto: 'data:image/jpeg;base64,AAAA' } }).success, true);
  assert.equal(analisar(schemas.foto, { body: { foto: 'data:text/html;base64,AAAA' } }).success, false);
  assert.equal(analisar(schemas.foto, { body: { foto: 'data:image/svg+xml;base64,AAAA' } }).success, false);
  assert.equal(analisar(schemas.foto, { body: { foto: 'https://exemplo.com/foto.jpg' } }).success, false);
});

test('foto de perfil recusa imagem acima do limite da coluna', () => {
  const gigante = 'data:image/jpeg;base64,' + 'A'.repeat(200_001);
  assert.equal(analisar(schemas.foto, { body: { foto: gigante } }).success, false);
});

test('perfil exige nome com pelo menos 3 caracteres e e-mail válido', () => {
  assert.equal(analisar(schemas.perfil, { body: { nome: 'Ana Souza', email: 'a@b.com' } }).success, true);
  assert.equal(analisar(schemas.perfil, { body: { nome: 'An', email: 'a@b.com' } }).success, false);
  assert.equal(analisar(schemas.perfil, { body: { nome: 'Ana Souza', email: 'nao-e-email' } }).success, false);
});

test('item de carrinho limita a quantidade por vez', () => {
  assert.equal(analisar(schemas.itemCarrinho, { body: { idEstoque: '5', quantidade: '20' } }).success, true);
  assert.equal(analisar(schemas.itemCarrinho, { body: { idEstoque: '5', quantidade: '21' } }).success, false);
  assert.equal(analisar(schemas.itemCarrinho, { body: { idEstoque: '5', quantidade: '0' } }).success, false);
});

test('validar responde 422 com detalhes e não chama o próximo middleware', () => {
  const req = { body: { email: 'nao-e-email', senha: '' }, params: {}, query: {} };
  const res = respostaFalsa();
  let seguiu = false;
  validar(schemas.login)(req, res, () => { seguiu = true; });
  assert.equal(res.codigo, 422);
  assert.equal(seguiu, false);
  assert.equal(res.corpo.erro, 'Dados inválidos.');
  assert.ok(res.corpo.detalhes);
});
