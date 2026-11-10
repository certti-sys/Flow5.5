/**
 * Hook de Sincronização em Background: localStorage → Supabase
 * 
 * REGRAS:
 * - NÃO altera nenhum hook existente
 * - localStorage permanece fonte primária
 * - Supabase é backup silencioso
 * - Falhas são logadas mas não bloqueiam a UI
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_SYNC_EVENT } from './useStorageSync';

// Mapeamento de chaves localStorage → tabelas Supabase
const SYNC_MAPPING: Record<string, {
  table: string;
  transform: (data: any) => any;
  isSingleton?: boolean;
}> = {
  'memberhero_settings': {
    table: 'platform_settings',
    isSingleton: true,
    transform: (data) => ({
      platform_name: data.platformName,
      logo: data.logo,
      favicon: data.favicon,
      primary_color: data.primaryColor,
      background_color: data.backgroundColor,
      surface_color: data.surfaceColor,
      text_color: data.textColor,
      welcome_message: data.welcomeMessage,
      footer_text: data.footerText,
      support_email: data.supportEmail,
      google_analytics_id: data.googleAnalyticsId,
      facebook_pixel_id: data.facebookPixelId,
      maintenance_mode: data.maintenanceMode,
      allow_registration: data.allowRegistration,
    }),
  },
  'mh_banner_principal': {
    table: 'banner_principal',
    isSingleton: true,
    transform: (data) => ({
      imagem_url: data.imagemUrl || data.imagemBase64,
      exibir: data.exibir,
      aspect_ratio: data.aspectRatio,
      object_fit: data.objectFit,
      largura_original: data.larguraOriginal,
      altura_original: data.alturaOriginal,
    }),
  },
  'mh_banners_secundarios': {
    table: 'banners_secundarios',
    isSingleton: false,
    transform: (banners: any[]) => banners.map((b) => ({
      id: b.id,
      nome: b.nome,
      imagem_url: b.imagemUrl || b.imagemBase64,
      posicao: b.posicao,
      tipo: b.tipo,
      ativo: b.ativo,
      ordem: b.ordem,
      agendamento_habilitado: b.agendamento?.habilitado || false,
      agendamento_data_inicio: b.agendamento?.dataInicio || null,
      agendamento_hora_inicio: b.agendamento?.horaInicio || null,
      agendamento_data_fim: b.agendamento?.dataFim || null,
      agendamento_hora_fim: b.agendamento?.horaFim || null,
    })),
  },
  'memberhero_notificacoes': {
    table: 'notifications',
    isSingleton: false,
    transform: (notifications: any[]) => notifications.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      titulo: n.titulo,
      mensagem: n.mensagem,
      curso_id: n.cursoId || null,
      modulo_id: n.moduloId || null,
      aula_id: n.aulaId || null,
      lida: n.lida,
      created_at: n.criadoEm,
    })),
  },
  'memberhero_webhooks': {
    table: 'webhooks',
    isSingleton: false,
    transform: (webhooks: any[]) => webhooks.map((w) => ({
      id: w.id,
      curso_id: w.cursoId,
      plataforma: w.plataforma,
      secret_key: w.secretKey,
      ativo: w.ativo,
      external_product_id: w.externalProductId || null,
      checkout_url: w.checkoutUrl || null,
      created_at: w.criadoEm,
    })),
  },
  'memberhero_webhook_logs': {
    table: 'webhook_logs',
    isSingleton: false,
    transform: (logs: any[]) => logs.map((l) => ({
      id: l.id,
      webhook_id: l.webhookId === 'manual' ? null : l.webhookId,
      curso_id: l.cursoId,
      plataforma: l.plataforma,
      evento: l.evento,
      payload: l.payload,
      status: l.status,
      mensagem: l.mensagem,
      created_at: l.criadoEm,
    })),
  },
  'mh_cards_settings': {
    table: 'cards_settings',
    isSingleton: true,
    transform: (data) => ({
      layout: data.layout,
      show_progress: data.showProgress,
      show_category: data.showCategory,
      show_duration: data.showDuration,
      image_aspect_ratio: data.imageAspectRatio,
    }),
  },
};

// Chaves que devem ser monitoradas
const MONITORED_KEYS = Object.keys(SYNC_MAPPING);

interface SyncStatus {
  lastSync: string | null;
  pending: number;
  errors: string[];
}

interface UseSyncToSupabaseOptions {
  enabled?: boolean;
  debounceMs?: number;
  onSyncComplete?: (key: string) => void;
  onSyncError?: (key: string, error: Error) => void;
}

export function useSyncToSupabase(options: UseSyncToSupabaseOptions = {}) {
  const {
    enabled = true,
    debounceMs = 2000,
    onSyncComplete,
    onSyncError,
  } = options;

  const syncQueueRef = useRef<Set<string>>(new Set());
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const statusRef = useRef<SyncStatus>({
    lastSync: null,
    pending: 0,
    errors: [],
  });

  // Função para sincronizar uma chave específica
  const syncKey = useCallback(async (key: string) => {
    const mapping = SYNC_MAPPING[key];
    if (!mapping) return;

    try {
      const rawData = localStorage.getItem(key);
      if (!rawData) return;

      const data = JSON.parse(rawData);
      const transformed = mapping.transform(data);

      if (mapping.isSingleton) {
        // Para singletons, atualiza o primeiro registro
        const { data: existing } = await (supabase
          .from(mapping.table as any)
          .select('id')
          .limit(1)
          .maybeSingle() as any);

        if (existing) {
          const { error } = await (supabase
            .from(mapping.table as any)
            .update(transformed)
            .eq('id', existing.id) as any);

          if (error) throw error;
        }
      } else {
        // Para arrays, usa upsert
        if (Array.isArray(transformed) && transformed.length > 0) {
          const { error } = await (supabase
            .from(mapping.table as any)
            .upsert(transformed, { onConflict: 'id' }) as any);

          if (error) throw error;
        }
      }

      statusRef.current.lastSync = new Date().toISOString();
      syncQueueRef.current.delete(key);
      statusRef.current.pending = syncQueueRef.current.size;

      console.log(`[SyncToSupabase] ✓ Synced: ${key}`);
      onSyncComplete?.(key);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      statusRef.current.errors.push(`${key}: ${errorMessage}`);
      
      // Manter apenas os últimos 10 erros
      if (statusRef.current.errors.length > 10) {
        statusRef.current.errors = statusRef.current.errors.slice(-10);
      }

      console.warn(`[SyncToSupabase] ✗ Error syncing ${key}:`, errorMessage);
      onSyncError?.(key, error instanceof Error ? error : new Error(errorMessage));
    }
  }, [onSyncComplete, onSyncError]);

  // Função para enfileirar uma sincronização com debounce
  const queueSync = useCallback((key: string) => {
    if (!enabled) return;
    if (!MONITORED_KEYS.includes(key)) return;

    syncQueueRef.current.add(key);
    statusRef.current.pending = syncQueueRef.current.size;

    // Limpa timer anterior
    if (debounceTimersRef.current[key]) {
      clearTimeout(debounceTimersRef.current[key]);
    }

    // Cria novo timer com debounce
    debounceTimersRef.current[key] = setTimeout(() => {
      syncKey(key);
    }, debounceMs);
  }, [enabled, debounceMs, syncKey]);

  // Listener para eventos de sync do localStorage
  useEffect(() => {
    if (!enabled) return;

    const handleStorageSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      const key = customEvent.detail?.key;
      if (key && MONITORED_KEYS.includes(key)) {
        queueSync(key);
      }
    };

    const handleNativeStorage = (e: StorageEvent) => {
      if (e.key && MONITORED_KEYS.includes(e.key)) {
        queueSync(e.key);
      }
    };

    window.addEventListener(STORAGE_SYNC_EVENT, handleStorageSync);
    window.addEventListener('storage', handleNativeStorage);

    return () => {
      window.removeEventListener(STORAGE_SYNC_EVENT, handleStorageSync);
      window.removeEventListener('storage', handleNativeStorage);

      // Limpa todos os timers
      Object.values(debounceTimersRef.current).forEach(clearTimeout);
    };
  }, [enabled, queueSync]);

  // Função para sincronizar tudo manualmente
  const syncAll = useCallback(async () => {
    if (!enabled) return;

    console.log('[SyncToSupabase] Starting full sync...');
    
    for (const key of MONITORED_KEYS) {
      await syncKey(key);
    }

    console.log('[SyncToSupabase] Full sync complete');
  }, [enabled, syncKey]);

  // Função para obter status atual
  const getStatus = useCallback((): SyncStatus => {
    return { ...statusRef.current };
  }, []);

  return {
    syncAll,
    syncKey: queueSync,
    getStatus,
    isEnabled: enabled,
    monitoredKeys: MONITORED_KEYS,
  };
}

// Hook simplificado para usar em componentes que precisam de status
export function useSyncStatus() {
  const { getStatus } = useSyncToSupabase({ enabled: false });
  return getStatus();
}
