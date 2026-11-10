import { useState, useEffect } from 'react';

export interface WebhookConfig {
  id: string;
  cursoId: string;
  plataforma: 'hotmart' | 'monetizze' | 'eduzz' | 'kiwify' | 'bripe' | 'outro';
  secretKey: string;
  ativo: boolean;
  criadoEm: string;
  externalProductId?: string;
  checkoutUrl?: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  cursoId: string;
  plataforma: string;
  evento: string;
  payload: Record<string, unknown>;
  status: 'sucesso' | 'erro' | 'processando';
  mensagem: string;
  criadoEm: string;
}

const WEBHOOKS_KEY = 'memberhero_webhooks';
const LOGS_KEY = 'memberhero_webhook_logs';

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const carregarDados = () => {
    try {
      const webhooksData = localStorage.getItem(WEBHOOKS_KEY);
      const logsData = localStorage.getItem(LOGS_KEY);
      
      if (webhooksData) setWebhooks(JSON.parse(webhooksData));
      if (logsData) setLogs(JSON.parse(logsData));
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const salvarWebhooks = (novosWebhooks: WebhookConfig[]) => {
    try {
      localStorage.setItem(WEBHOOKS_KEY, JSON.stringify(novosWebhooks));
      setWebhooks(novosWebhooks);
    } catch (error) {
      console.error('Erro ao salvar webhooks:', error);
    }
  };

  const salvarLogs = (novosLogs: WebhookLog[]) => {
    try {
      localStorage.setItem(LOGS_KEY, JSON.stringify(novosLogs));
      setLogs(novosLogs);
    } catch (error) {
      console.error('Erro ao salvar logs:', error);
    }
  };

  const criarWebhook = (dados: Omit<WebhookConfig, 'id' | 'criadoEm'>): WebhookConfig => {
    const novoWebhook: WebhookConfig = {
      ...dados,
      id: crypto.randomUUID(),
      criadoEm: new Date().toISOString(),
    };
    
    const novosWebhooks = [...webhooks, novoWebhook];
    salvarWebhooks(novosWebhooks);
    return novoWebhook;
  };

  const editarWebhook = (id: string, dadosAtualizados: Partial<WebhookConfig>): WebhookConfig | null => {
    const index = webhooks.findIndex(w => w.id === id);
    if (index === -1) return null;

    const webhookAtualizado = { ...webhooks[index], ...dadosAtualizados };
    const novosWebhooks = [...webhooks];
    novosWebhooks[index] = webhookAtualizado;
    salvarWebhooks(novosWebhooks);
    return webhookAtualizado;
  };

  const excluirWebhook = (id: string): boolean => {
    const novosWebhooks = webhooks.filter(w => w.id !== id);
    if (novosWebhooks.length === webhooks.length) return false;
    salvarWebhooks(novosWebhooks);
    return true;
  };

  const obterWebhookPorCurso = (cursoId: string): WebhookConfig | undefined => {
    return webhooks.find(w => w.cursoId === cursoId);
  };

  const obterWebhook = (id: string): WebhookConfig | undefined => {
    return webhooks.find(w => w.id === id);
  };

  const adicionarLog = (dados: Omit<WebhookLog, 'id' | 'criadoEm'>): WebhookLog => {
    const novoLog: WebhookLog = {
      ...dados,
      id: crypto.randomUUID(),
      criadoEm: new Date().toISOString(),
    };
    
    const novosLogs = [novoLog, ...logs].slice(0, 100); // Mantém apenas os últimos 100 logs
    salvarLogs(novosLogs);
    return novoLog;
  };

  const obterLogsPorWebhook = (webhookId: string): WebhookLog[] => {
    return logs.filter(l => l.webhookId === webhookId);
  };

  const obterLogsPorCurso = (cursoId: string): WebhookLog[] => {
    return logs.filter(l => l.cursoId === cursoId);
  };

  const limparLogs = (): void => {
    salvarLogs([]);
  };

  // Simular processamento de webhook de compra
  const processarWebhookCompra = (
    cursoId: string,
    email: string,
    plataforma: string,
    transacaoId: string
  ): WebhookLog => {
    const webhook = obterWebhookPorCurso(cursoId);
    
    const log = adicionarLog({
      webhookId: webhook?.id || 'manual',
      cursoId,
      plataforma,
      evento: 'compra_aprovada',
      payload: {
        email,
        transacaoId,
        cursoId,
        timestamp: new Date().toISOString(),
      },
      status: 'sucesso',
      mensagem: `Acesso liberado para ${email}`,
    });

    return log;
  };

  useEffect(() => {
    carregarDados();
  }, []);

  return {
    webhooks,
    logs,
    isLoading,
    criarWebhook,
    editarWebhook,
    excluirWebhook,
    obterWebhook,
    obterWebhookPorCurso,
    adicionarLog,
    obterLogsPorWebhook,
    obterLogsPorCurso,
    limparLogs,
    processarWebhookCompra,
    carregarDados,
  };
}

// Plataformas disponíveis
export const plataformas = [
  { value: 'hotmart', label: 'Hotmart' },
  { value: 'monetizze', label: 'Monetizze' },
  { value: 'eduzz', label: 'Eduzz' },
  { value: 'kiwify', label: 'Kiwify' },
  { value: 'bripe', label: 'Bripe' },
  { value: 'outro', label: 'Outra' },
] as const;
