import { z } from 'zod';

export function validar(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) return res.status(422).json({ erro: 'Dados inválidos.', detalhes: result.error.flatten() });
    req.validado = result.data;
    next();
  };
}

const vazio = z.literal('').transform(() => undefined);
const idOpcional = z.union([vazio, z.coerce.number().int().positive()]).optional();

const FOTO_MAXIMA = 200_000;
const fotoPerfil = z.string()
  .regex(/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+={0,2}$/, 'Envie uma imagem PNG, JPEG ou WebP.')
  .max(FOTO_MAXIMA, 'Imagem muito grande. Escolha uma foto menor.');

const semParametros = { params: z.object({}), query: z.object({}) };

export const schemas = {
  cadastro: z.object({
    body: z.object({
      nome: z.string().trim().min(3).max(120),
      email: z.string().email().max(255),
      senha: z.string().min(8).max(72),
      tipo: z.enum(['cliente', 'vendedor']).default('cliente')
    }),
    ...semParametros
  }),
  login: z.object({
    body: z.object({ email: z.string().email(), senha: z.string().min(1) }),
    ...semParametros
  }),
  produto: z.object({
    body: z.object({
      nome: z.string().trim().min(2).max(160),
      descricao: z.string().max(5000).optional(),
      preco: z.coerce.number().nonnegative().max(1_000_000),
      idCategoria: z.coerce.number().int().positive(),
      idMarca: z.coerce.number().int().positive()
    }),
    ...semParametros
  }),
  itemCarrinho: z.object({
    body: z.object({
      idEstoque: z.coerce.number().int().positive(),
      quantidade: z.coerce.number().int().positive().max(20)
    }),
    ...semParametros
  }),
  catalogo: z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({
      busca: z.string().max(80).optional(),
      marca: idOpcional,
      categoria: idOpcional
    })
  }),
  imagens: z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({ q: z.string().max(80).optional(), categoria: z.string().max(80).optional() })
  }),
  foto: z.object({ body: z.object({ foto: fotoPerfil }), ...semParametros }),
  logoLoja: z.object({ body: z.object({ logo: fotoPerfil }), ...semParametros })
};
