// Re-export do hook Supabase
export * from './useSupabaseLessons';
export { useSupabaseLessons as useLessons } from './useSupabaseLessons';

// Manter a função converterParaBase64 para compatibilidade
export const converterParaBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};
