export function respostaFalsa() {
  return {
    codigo: null,
    corpo: null,
    status(c) { this.codigo = c; return this; },
    json(d) { this.corpo = d; return this; }
  };
}
