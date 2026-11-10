/**
 * Configuração de Fonte de Dados
 * 
 * Flag global para controlar se a leitura deve ser feita do banco de dados
 * ou do localStorage. Esta flag só deve ser ativada após validação 100% bem-sucedida.
 * 
 * COMPORTAMENTO:
 * - USE_DATABASE = false: Leitura do localStorage, escrita em ambos
 * - USE_DATABASE = true: Leitura do banco com fallback para localStorage
 */

// Flag global - ALTERAR PARA true SOMENTE após validação 100%
export const USE_DATABASE = false;

// Chave para armazenar status da validação
const VALIDATION_STATUS_KEY = 'mh_validation_status';
const VALIDATION_TIMESTAMP_KEY = 'mh_validation_timestamp';

/**
 * Verifica se deve usar o banco de dados para leitura
 * Só retorna true se:
 * 1. USE_DATABASE está true
 * 2. A validação foi concluída com sucesso
 */
export function shouldUseDatabase(): boolean {
  if (!USE_DATABASE) return false;
  
  try {
    const validationStatus = localStorage.getItem(VALIDATION_STATUS_KEY);
    return validationStatus === 'passed';
  } catch {
    return false;
  }
}

/**
 * Marca a validação como bem-sucedida
 */
export function markValidationPassed(): void {
  try {
    localStorage.setItem(VALIDATION_STATUS_KEY, 'passed');
    localStorage.setItem(VALIDATION_TIMESTAMP_KEY, new Date().toISOString());
  } catch (error) {
    console.warn('[DataSource] Erro ao salvar status de validação:', error);
  }
}

/**
 * Marca a validação como falha
 */
export function markValidationFailed(): void {
  try {
    localStorage.setItem(VALIDATION_STATUS_KEY, 'failed');
    localStorage.setItem(VALIDATION_TIMESTAMP_KEY, new Date().toISOString());
  } catch (error) {
    console.warn('[DataSource] Erro ao salvar status de validação:', error);
  }
}

/**
 * Obtém o status da validação
 */
export function getValidationStatus(): { status: 'passed' | 'failed' | 'pending'; timestamp: string | null } {
  try {
    const status = localStorage.getItem(VALIDATION_STATUS_KEY) as 'passed' | 'failed' | null;
    const timestamp = localStorage.getItem(VALIDATION_TIMESTAMP_KEY);
    return {
      status: status || 'pending',
      timestamp,
    };
  } catch {
    return { status: 'pending', timestamp: null };
  }
}

/**
 * Helper para ler dados do localStorage de forma segura
 */
export function readFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Helper para escrever dados no localStorage de forma segura
 */
export function writeToLocalStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('[DataSource] Erro ao escrever no localStorage:', error);
    return false;
  }
}
