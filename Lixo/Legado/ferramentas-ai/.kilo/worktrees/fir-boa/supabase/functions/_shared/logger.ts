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
    if (data) {
      console.log(`[INFO] ${message}`, maskPII(data));
    } else {
      console.log(`[INFO] ${message}`);
    }
  },
  error: (message: string, error?: any) => {
    if (error) {
      console.error(`[ERROR] ${message}`, maskPII(error));
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },
  warn: (message: string, data?: any) => {
    if (data) {
      console.warn(`[WARN] ${message}`, maskPII(data));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }
};
