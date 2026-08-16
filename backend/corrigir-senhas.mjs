import { pool } from './src/db.js';
import { gerarHash } from './src/auth.js';

const { rows } = await pool.query(
  "SELECT id_usuario, email, tipo, senha FROM usuarios WHERE senha NOT LIKE '$2%' OR length(senha) <> 60 ORDER BY id_usuario"
);

if (!rows.length) {
  console.log('Nada a corrigir: todas as senhas ja estao com hash bcrypt.');
  await pool.end();
  process.exit(0);
}

console.log('Contas com senha em texto puro (valor atual, para poder reverter):');
for (const usuario of rows) {
  console.log('  ' + usuario.email.padEnd(24) + ' tipo=' + usuario.tipo.padEnd(9) + ' senha="' + usuario.senha + '"');
}

console.log('\nRegravando com bcrypt (mantendo a MESMA senha)...');
for (const usuario of rows) {
  const hash = await gerarHash(usuario.senha);
  await pool.query('UPDATE usuarios SET senha=$1 WHERE id_usuario=$2', [hash, usuario.id_usuario]);
  console.log('  ok: ' + usuario.email);
}

const { rows: depois } = await pool.query(
  'SELECT email, tipo, length(senha) AS tam, left(senha,7) AS prefixo FROM usuarios ORDER BY id_usuario'
);
console.log('\nEstado final:');
console.table(depois);
await pool.end();
