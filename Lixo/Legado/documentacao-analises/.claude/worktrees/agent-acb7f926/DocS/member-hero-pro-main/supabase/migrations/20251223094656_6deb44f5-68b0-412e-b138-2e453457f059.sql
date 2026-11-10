-- Adicionar coluna categoria_id na tabela shelves para prateleiras por categoria
ALTER TABLE shelves 
ADD COLUMN categoria_id uuid REFERENCES categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN shelves.categoria_id IS 'Categoria vinculada para prateleiras do tipo categoria';