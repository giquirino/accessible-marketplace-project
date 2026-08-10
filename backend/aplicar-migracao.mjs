import fs from 'node:fs';
import { pool } from './src/db.js';

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Uso: node aplicar-migracao.mjs database/00X_arquivo.sql');
  process.exit(1);
}

const sql = fs.readFileSync(arquivo, 'utf8');
console.log('Aplicando ' + arquivo + '...');
await pool.query(sql);
console.log('ok');

const { rows } = await pool.query(
  "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='lojas' ORDER BY ordinal_position"
);
console.table(rows);
await pool.end();
