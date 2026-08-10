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

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
