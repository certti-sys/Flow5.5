import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCourseSearch = (searchTerm: string) => {
  return useQuery({
    queryKey: ["courseSearch", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, thumbnail, category, instructor")
        .or(`title.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,instructor.ilike.%${searchTerm}%`)
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: searchTerm.length >= 2,
    staleTime: 30000,
  });
};
