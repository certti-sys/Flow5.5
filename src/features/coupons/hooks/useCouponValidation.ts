import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CouponValidationInput, CouponValidationResult } from '../types';

export function useCouponValidation() {
  return useMutation({
    mutationFn: async (data: CouponValidationInput): Promise<CouponValidationResult> => {
      const { data: result, error } = await supabase.functions.invoke('validate-coupon', {
        body: data
      });

      if (error) {
        throw new Error(error.message);
      }

      return result as CouponValidationResult;
    }
  });
}