-- Permitir que usuários façam upload de seus próprios avatares
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'media' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Permitir que usuários atualizem seus próprios avatares
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'media' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Permitir que usuários deletem seus próprios avatares
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'media' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);