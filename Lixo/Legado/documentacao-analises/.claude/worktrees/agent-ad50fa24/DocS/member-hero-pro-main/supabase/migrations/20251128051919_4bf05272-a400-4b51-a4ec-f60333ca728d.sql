-- Criar bucket público para imagens da comunidade
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-images', 
  'community-images', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Política de leitura pública
CREATE POLICY "Imagens da comunidade são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-images');

-- Política de upload/update/delete para admins
CREATE POLICY "Admins podem gerenciar imagens da comunidade"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'community-images');

CREATE POLICY "Admins podem atualizar imagens da comunidade"
ON storage.objects FOR UPDATE
USING (bucket_id = 'community-images');

CREATE POLICY "Admins podem deletar imagens da comunidade"
ON storage.objects FOR DELETE
USING (bucket_id = 'community-images');