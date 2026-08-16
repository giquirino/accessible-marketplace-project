import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const diretorioAtual = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(diretorioAtual, '../.env') });

const variaveisObrigatorias = ['DATABASE_URL', 'JWT_SECRET'];

for (const nomeDaVariavel of variaveisObrigatorias) {
  if (!process.env[nomeDaVariavel]) {
    throw new Error(`Variável obrigatória ausente: ${nomeDaVariavel}`);
  }
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres.');
}

const origensPermitidas = (process.env.FRONTEND_ORIGIN || 'http://localhost:5500')
  .split(',')
  .map((origem) => origem.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  origensPermitidas,
  databaseCaCert: process.env.DATABASE_CA_CERT,
  databaseSslInseguro: process.env.DATABASE_SSL_INSECURE === 'true',
  pexelsApiKey: process.env.PEXELS_API_KEY
};
