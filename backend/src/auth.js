import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

export const criarToken = (usuario) => jwt.sign(
  { id: usuario.id_usuario, tipo: usuario.tipo, nome: usuario.nome },
  config.jwtSecret,
  { expiresIn: '8h' }
);

export function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization;

  let token = null;
  if (cabecalho) {
    token = cabecalho.replace(/^Bearer\s+/i, '');
  }

  if (!token) {
    res.status(401).json({ erro: 'Token de acesso ausente.' });
    return;
  }

  try {
    req.usuario = jwt.verify(token, config.jwtSecret);
    next();
  } catch (erro) {
    res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

export const permitir = (...tiposPermitidos) => (req, res, next) => {
  if (!req.usuario) {
    res.status(401).json({ erro: 'Token de acesso ausente.' });
    return;
  }

  if (!tiposPermitidos.includes(req.usuario.tipo)) {
    res.status(403).json({ erro: 'Você não tem permissão para esta ação.' });
    return;
  }

  next();
};

export const gerarHash = (senha) => bcrypt.hash(senha, 12);
export const compararSenha = (senha, hash) => bcrypt.compare(senha, hash);
