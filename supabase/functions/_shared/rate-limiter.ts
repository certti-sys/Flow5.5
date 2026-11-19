import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logger } from "./logger.ts";

/**
 * Interface para o resultado da verificação de rate limit
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

/**
 * checkRateLimit
 * Implementação de Fixed Window Rate Limiting usando PostgreSQL.
 * 
 * @param supabase Cliente Supabase (Service Role recomendada)
 * @param identifier Identificador único (E-mail, IP, User ID)
 * @param action Nome da ação sendo monitorada (Ex: 'check-access', 'login')
 * @param limit Máximo de requisições permitidas
 * @param windowSeconds Tamanho da janela em segundos
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStartLimit = new Date(now.getTime() - windowSeconds * 1000);

  try {
    // 1. Buscar registro existente para este identificador e ação dentro da janela
    const { data, error } = await supabase
      .from('rate_limits')
      .select('id, count, window_start')
      .eq('identifier', identifier)
      .eq('action', action)
      .gt('window_start', windowStartLimit.toISOString())
      .maybeSingle();

    if (error) {
      logger.error('Error fetching rate limit', error);
      // Em caso de erro no banco, permitimos a ação para não bloquear o usuário (fail-open)
      return { allowed: true, remaining: limit - 1 };
    }

    if (!data) {
      // 2. Não existe registro ou janela expirou, criar novo registro
      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({
          identifier,
          action,
          count: 1,
          window_start: now.toISOString()
        });

      if (insertError) {
        logger.error('Error inserting rate limit', insertError);
        return { allowed: true, remaining: limit - 1 };
      }

      return { allowed: true, remaining: limit - 1 };
    }

    // 3. Registro existe, verificar se ultrapassou o limite
    if (data.count >= limit) {
      const windowStart = new Date(data.window_start);
      const secondsSinceStart = Math.floor((now.getTime() - windowStart.getTime()) / 1000);
      const retryAfter = Math.max(0, windowSeconds - secondsSinceStart);

      logger.warn(`Rate limit exceeded`, { identifier, action, count: data.count, limit });
      return { allowed: false, remaining: 0, retryAfter };
    }

    // 4. Incrementar contador
    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ count: data.count + 1 })
      .eq('id', data.id);

    if (updateError) {
      logger.error('Error updating rate limit', updateError);
      return { allowed: true, remaining: limit - data.count - 1 };
    }

    return { allowed: true, remaining: limit - data.count - 1 };

  } catch (error) {
    logger.error('Critical error in rate limiter', error);
    return { allowed: true, remaining: 0 };
  }
}

export interface PendingOrdersResult {
  allowed: boolean;
  /** Qual limite estourou — só para o log; a resposta ao cliente é genérica. */
  reason?: 'ip' | 'email';
}

/**
 * Limite de pedidos *pendentes* por hora — freia bot que gera PIX/carrinho em
 * massa sem pagar. O `checkRateLimit` conta requisições; este conta pedidos que
 * ficaram abertos, então uma pessoa que erra o cartão e tenta de novo não é
 * penalizada na mesma proporção.
 *
 * O IP vem de `orders.metadata.device.ip` (gravado no insert pelo servidor):
 * não existe coluna `ip_hash` e não vale criar uma — o IP cru já é necessário
 * para a Pixel X, então um hash ao lado seria duplicação, não privacidade.
 *
 * Fail-open, como o resto do limiter: erro no banco não pode derrubar checkout.
 */
export async function checkPendingOrders(
  supabase: SupabaseClient,
  { ip, email }: { ip?: string | null; email?: string | null },
  limits = { ip: 25, email: 15 },
  windowMinutes = 60
): Promise<PendingOrdersResult> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  try {
    if (ip) {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('created_at', since)
        .filter('metadata->device->>ip', 'eq', ip);

      if (error) logger.error('Error counting pending orders by ip', error);
      else if ((count ?? 0) >= limits.ip) {
        logger.warn('Pending order limit hit (ip)', { ip, count, limit: limits.ip });
        return { allowed: false, reason: 'ip' };
      }
    }

    if (email) {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('created_at', since)
        .eq('customer_email', email);

      if (error) logger.error('Error counting pending orders by email', error);
      else if ((count ?? 0) >= limits.email) {
        logger.warn('Pending order limit hit (email)', { email, count, limit: limits.email });
        return { allowed: false, reason: 'email' };
      }
    }

    return { allowed: true };
  } catch (error) {
    logger.error('Critical error counting pending orders', error);
    return { allowed: true };
  }
}
