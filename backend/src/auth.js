import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

export const criarToken = (usuario) => jwt.sign(
  { id: usuario.id_usuario, tipo: usuario.tipo, nome: usuario.nome }, config.jwtSecret, { expiresIn: '8h' }
);

export function autenticar(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ erro: 'Token de acesso ausente.' });
  try { req.usuario = jwt.verify(token, config.jwtSecret); next(); }
  catch { return res.status(401).json({ erro: 'Token inválido ou expirado.' }); }
}

export const permitir = (...tipos) => (req, res, next) => {
  if (!req.usuario) return res.status(401).json({ erro: 'Token de acesso ausente.' });
  if (!tipos.includes(req.usuario.tipo)) return res.status(403).json({ erro: 'Você não tem permissão para esta ação.' });
  next();
};

export const gerarHash = (senha) => bcrypt.hash(senha, 12);
export const compararSenha = (senha, hash) => bcrypt.compare(senha, hash);
