/**
 * logger.ts
 * Utilitário centralizado para logs seguros em Edge Functions.
 * Mascara automaticamente dados sensíveis (PII).
 */

const SENSITIVE_KEYS = [
  'email', 'name', 'phone', 'fullname', 'full_name', 
  'cpf', 'password', 'token', 'access_token', 'authorization',
  'api_key', 'apikey', 'secret', 'signature', 'customer'
];

/**
 * Mascara valores de chaves sensíveis em um objeto.
 */
function maskPII(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(maskPII);
  }

  const maskedObj = { ...obj };
  for (const key in maskedObj) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(k => lowerKey.includes(k))) {
      maskedObj[key] = '[MASKED]';
    } else if (typeof maskedObj[key] === 'object') {
      maskedObj[key] = maskPII(maskedObj[key]);
    }
  }
  return maskedObj;
}

export const logger = {
  info: (message: string, data?: any) => {
    const masked = data ? maskPII(data) : undefined;
    console.log(`[INFO] ${message}`, masked || "");
  },
  error: (message: string, error?: any) => {
    const masked = error ? maskPII(error) : undefined;
    console.error(`[ERROR] ${message}`, masked || "");
  },
  warn: (message: string, data?: any) => {
    const masked = data ? maskPII(data) : undefined;
    console.warn(`[WARN] ${message}`, masked || "");
  },
  /**
   * Persists a log entry to the database if enabled in platform_settings.
   * Note: This involves a DB roundtrip, use only for critical events.
   */
  persist: async (supabase: any, level: 'info' | 'warn' | 'error', message: string, details: any = {}) => {
    try {
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('monitoring_internal_logs_active')
        .eq('is_active', true)
        .maybeSingle();
        
      if (settings?.monitoring_internal_logs_active) {
        await supabase.from('system_logs').insert({
          level,
          message,
          details: maskPII(details)
        });
      }
    } catch (err) {
      console.error("Failed to persist system log:", err);
    }
  }
};
