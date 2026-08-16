import { z } from 'zod';

export function validar(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse({ body: req.body || {}, params: req.params, query: req.query });

    if (!resultado.success) {
      res.status(422).json({ erro: 'Dados inválidos.', detalhes: resultado.error.flatten() });
      return;
    }

    req.validado = resultado.data;
    next();
  };
}

const semParametros = {
  params: z.object({}),
  query: z.object({})
};

const filtroDeIdOpcional = z
  .union([
    z.literal('').transform(() => undefined),
    z.coerce.number().int().positive()
  ])
  .optional();

const FOTO_MAXIMA = 200_000;
const REGEX_DATA_URL_DE_IMAGEM = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

const fotoPerfil = z
  .string()
  .regex(REGEX_DATA_URL_DE_IMAGEM, 'Envie uma imagem PNG, JPEG ou WebP.')
  .max(FOTO_MAXIMA, 'Imagem muito grande. Escolha uma foto menor.');

const nomeDeUsuario = z
  .string()
  .trim()
  .min(3)
  .max(120);

const email = z
  .string()
  .email()
  .max(255);

export const schemas = {
  cadastro: z.object({
    body: z.object({
      nome: nomeDeUsuario,
      email: email,
      senha: z.string().min(8).max(72),
      tipo: z.enum(['cliente', 'vendedor']).default('cliente')
    }),
    ...semParametros
  }),

  login: z.object({
    body: z.object({
      email: z.string().email(),
      senha: z.string().min(1)
    }),
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

  favorito: z.object({
    body: z.object({
      idTenis: z.coerce.number().int().positive()
    }),
    ...semParametros
  }),

  itemCarrinhoParam: z.object({
    body: z.object({}),
    query: z.object({}),
    params: z.object({
      idItemCarrinho: z.coerce.number().int().positive()
    })
  }),

  favoritoParam: z.object({
    body: z.object({}),
    query: z.object({}),
    params: z.object({
      idTenis: z.coerce.number().int().positive()
    })
  }),

  catalogo: z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({
      busca: z.string().max(80).optional(),
      marca: filtroDeIdOpcional,
      categoria: filtroDeIdOpcional
    })
  }),

  imagens: z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({
      q: z.string().max(80).optional(),
      categoria: z.string().max(80).optional()
    })
  }),

  perfil: z.object({
    body: z.object({
      nome: nomeDeUsuario,
      email: email
    }),
    ...semParametros
  }),

  foto: z.object({
    body: z.object({ foto: fotoPerfil }),
    ...semParametros
  }),

  logoLoja: z.object({
    body: z.object({ logo: fotoPerfil }),
    ...semParametros
  })
};
