-- Execute após o schema fornecido no roteiro. São tabelas necessárias para as telas já existentes.
CREATE TABLE IF NOT EXISTS fotos_tenis (
  id_foto BIGSERIAL PRIMARY KEY,
  fk_id_tenis BIGINT NOT NULL REFERENCES tenis(id_tenis) ON DELETE CASCADE,
  url TEXT NOT NULL,
  texto_alternativo TEXT NOT NULL,
  ordem SMALLINT NOT NULL DEFAULT 0 CHECK (ordem >= 0)
);

CREATE TABLE IF NOT EXISTS favoritos (
  fk_id_usuario BIGINT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  fk_id_tenis BIGINT NOT NULL REFERENCES tenis(id_tenis) ON DELETE CASCADE,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (fk_id_usuario, fk_id_tenis)
);

CREATE INDEX IF NOT EXISTS idx_tenis_catalogo ON tenis (status, fk_id_marca, fk_id_categoria);
CREATE INDEX IF NOT EXISTS idx_estoque_tenis ON em_estoque (fk_id_tenis);
