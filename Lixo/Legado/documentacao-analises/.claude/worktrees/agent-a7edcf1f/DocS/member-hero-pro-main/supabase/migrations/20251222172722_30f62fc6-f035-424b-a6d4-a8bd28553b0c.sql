-- Criar bucket media para armazenamento de imagens
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Política de upload para usuários autenticados com role admin
CREATE POLICY "Admins can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Política de leitura pública (imagens acessíveis a todos)
CREATE POLICY "Public media access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Política de atualização para admins
CREATE POLICY "Admins can update media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Política de deleção para admins
CREATE POLICY "Admins can delete media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);