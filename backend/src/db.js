import pg from 'pg';
import { config } from './config.js';

function configurarSsl() {
  if (config.databaseCaCert) {
    return { rejectUnauthorized: true, ca: config.databaseCaCert.replace(/\\n/g, '\n') };
  }

  if (config.databaseSslInseguro) {
    console.warn(
      '[db] DATABASE_SSL_INSECURE=true: a cadeia TLS do banco NÃO será verificada. ' +
      'Use apenas em desenvolvimento e preencha DATABASE_CA_CERT antes de publicar.'
    );
    return { rejectUnauthorized: false };
  }

  return { rejectUnauthorized: true };
}

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: configurarSsl(),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on('error', (erro) => console.error('[db] Erro em conexão ociosa:', erro));

export async function transaction(operacao) {
  const conexao = await pool.connect();

  try {
    await conexao.query('BEGIN');
    const resultado = await operacao(conexao);
    await conexao.query('COMMIT');
    return resultado;
  } catch (erro) {
    await conexao.query('ROLLBACK');
    throw erro;
  } finally {
    conexao.release();
  }
}
