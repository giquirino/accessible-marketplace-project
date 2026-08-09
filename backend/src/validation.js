import { z } from 'zod';

export function validar(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) return res.status(422).json({ erro: 'Dados inválidos.', detalhes: result.error.flatten() });
    req.validado = result.data;
    next();
  };
}

export const schemas = {
  cadastro: z.object({ body: z.object({ nome: z.string().trim().min(3).max(120), email: z.string().email().max(255), senha: z.string().min(8).max(72), tipo: z.enum(['cliente', 'vendedor']).default('cliente') }), params: z.object({}), query: z.object({}) }),
  login: z.object({ body: z.object({ email: z.string().email(), senha: z.string().min(1) }), params: z.object({}), query: z.object({}) }),
  produto: z.object({ body: z.object({ nome: z.string().trim().min(2), descricao: z.string().max(5000).optional(), preco: z.coerce.number().nonnegative(), idCategoria: z.coerce.number().int().positive(), idMarca: z.coerce.number().int().positive(), status: z.enum(['ativo', 'inativo', 'em_analise']).default('em_analise') }), params: z.object({}), query: z.object({}) }),
  itemCarrinho: z.object({ body: z.object({ idEstoque: z.coerce.number().int().positive(), quantidade: z.coerce.number().int().positive().max(20) }), params: z.object({}), query: z.object({}) })
};
