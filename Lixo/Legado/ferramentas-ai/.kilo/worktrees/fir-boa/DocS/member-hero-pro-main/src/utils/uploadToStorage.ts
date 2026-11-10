import { supabase } from "@/integrations/supabase/client";

/**
 * Upload de arquivo para o bucket 'media' do Supabase Storage
 */
export async function uploadFile(
  file: File,
  folder: string = "uploads"
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("media")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Erro no upload:", error);
    if (error.message?.includes("bucket") || error.message?.includes("Bucket")) {
      throw new Error("Bucket de mídia não encontrado. Verifique se o storage está configurado corretamente.");
    }
    if (error.message?.includes("not found")) {
      throw new Error("Bucket 'media' não existe. Execute a migração de criação do bucket.");
    }
    if (error.message?.includes("permission") || error.message?.includes("Policy")) {
      throw new Error("Sem permissão para upload. Verifique se você está autenticado como admin.");
    }
    throw new Error(`Erro ao fazer upload: ${error.message}`);
  }

  return getPublicUrl(data.path);
}

/**
 * Upload de string Base64 como arquivo
 */
export async function uploadBase64(
  base64: string,
  folder: string = "uploads",
  filename?: string
): Promise<string> {
  // Detectar tipo do Base64
  const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("String Base64 inválida");
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  
  // Converter para Blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });

  // Gerar nome do arquivo
  const ext = contentType.split("/")[1] || "png";
  const fileName = filename || `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from("media")
    .upload(filePath, blob, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Erro no upload Base64:", error);
    if (error.message?.includes("bucket") || error.message?.includes("Bucket")) {
      throw new Error("Bucket de mídia não encontrado. Verifique se o storage está configurado corretamente.");
    }
    if (error.message?.includes("not found")) {
      throw new Error("Bucket 'media' não existe. Execute a migração de criação do bucket.");
    }
    if (error.message?.includes("permission") || error.message?.includes("Policy")) {
      throw new Error("Sem permissão para upload. Verifique se você está autenticado como admin.");
    }
    throw new Error(`Erro ao fazer upload: ${error.message}`);
  }

  return getPublicUrl(data.path);
}

/**
 * Deletar arquivo do Storage
 */
export async function deleteFile(path: string): Promise<boolean> {
  // Extrair path relativo da URL completa se necessário
  const relativePath = path.includes("/storage/v1/object/public/media/")
    ? path.split("/storage/v1/object/public/media/")[1]
    : path;

  const { error } = await supabase.storage.from("media").remove([relativePath]);

  if (error) {
    console.error("Erro ao deletar arquivo:", error);
    return false;
  }

  return true;
}

/**
 * Obter URL pública de um arquivo
 */
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Processar upload de imagem (File ou Base64)
 */
export async function processImageUpload(
  image: string | File | null,
  folder: string = "courses"
): Promise<string> {
  if (!image) return "";

  // Se já for uma URL do Supabase, retornar sem processar
  if (typeof image === "string" && image.includes("supabase")) {
    return image;
  }

  // Se for Base64
  if (typeof image === "string" && image.startsWith("data:")) {
    return await uploadBase64(image, folder);
  }

  // Se for File
  if (image instanceof File) {
    return await uploadFile(image, folder);
  }

  // Se for string normal (URL externa), retornar como está
  return typeof image === "string" ? image : "";
}
