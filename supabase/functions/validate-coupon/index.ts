import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Schema de validação
const ValidateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  productId: z.string().uuid(),
  amount: z.number().positive(),
  userId: z.string().uuid().optional()
});

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse input
    const body = await req.json();
    const { code, productId, amount, userId } = ValidateCouponSchema.parse(body);

    // Initialize Supabase client
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader
        ? {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        : undefined
    );

    // 1. Buscar cupom
    const { data: coupon, error: couponError } = await supabaseClient
      .from('coupons')
      .select(`
        *,
        coupon_products (
          product_id
        )
      `)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Cupom inválido ou não encontrado'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validar data
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: `Cupom válido a partir de ${new Date(coupon.valid_from).toLocaleDateString('pt-BR')}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Cupom expirado'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validar produto
    if (coupon.coupon_products && coupon.coupon_products.length > 0) {
      const validForProduct = coupon.coupon_products.some(
        (cp: any) => cp.product_id === productId
      );
      if (!validForProduct) {
        return new Response(
          JSON.stringify({
            valid: false,
            error: 'Cupom não válido para este produto'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Validar valor mínimo
    if (amount < coupon.min_purchase_amount) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: `Valor mínimo de compra: R$ ${coupon.min_purchase_amount.toFixed(2)}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Validar limite de uso
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Cupom esgotado'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Calcular desconto
    let discountApplied = 0;
    if (coupon.discount_type === 'percent') {
      discountApplied = (amount * coupon.discount_value) / 100;
    } else {
      discountApplied = coupon.discount_value;
    }

    // Desconto não pode ser maior que o valor total
    discountApplied = Math.min(discountApplied, amount);

    // Retornar sucesso
    return new Response(
      JSON.stringify({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value
        },
        discount_applied: Number(discountApplied.toFixed(2))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating coupon:', error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: error instanceof z.ZodError
          ? 'Dados inválidos'
          : 'Erro ao validar cupom'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});