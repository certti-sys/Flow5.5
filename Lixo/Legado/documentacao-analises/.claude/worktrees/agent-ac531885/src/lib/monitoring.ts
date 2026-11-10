import { supabase } from "@/integrations/supabase/client";
import * as Sentry from "@sentry/react";

/**
 * Monitoring Utility
 * Centralizes logging and error tracking with resource consideration.
 */

let configCache: {
  sentry_dsn: string | null;
  sentry_active: boolean;
  internal_logs_active: boolean;
} | null = null;

async function fetchConfig() {
  if (configCache) return configCache;
  
  // Using try-catch to avoid breaking the app if table doesn't exist yet or network fails
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('monitoring_sentry_dsn, monitoring_sentry_active, monitoring_internal_logs_active')
      .single();
      
    if (error || !data) return null;
    
    configCache = {
      sentry_dsn: data.monitoring_sentry_dsn,
      sentry_active: data.monitoring_sentry_active,
      internal_logs_active: data.monitoring_internal_logs_active
    };
    
    return configCache;
  } catch (err) {
    console.warn("Failed to fetch monitoring config", err);
    return null;
  }
}

/**
 * Initializes Sentry if active and DSN is provided.
 */
export async function initMonitoring() {
  const config = await fetchConfig();
  if (!config) return;

  if (config.sentry_active && config.sentry_dsn) {
    console.log("[Monitoring] Initializing Sentry...");
    Sentry.init({
      dsn: config.sentry_dsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0,
      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
    });
  }
}

/**
 * Centralized Logger
 */
export const logger = {
  info: async (message: string, details: any = {}) => {
    if (import.meta.env.DEV) {
      console.log(`%c[INFO] ${message}`, "color: #3b82f6; font-weight: bold;", details);
    }
    
    const config = await fetchConfig();
    if (config?.internal_logs_active) {
      await supabase.from('system_logs').insert({
        level: 'info',
        message,
        details
      }).catch(err => console.error("Failed to persist log", err));
    }
  },

  warn: async (message: string, details: any = {}) => {
    console.warn(`[WARN] ${message}`, details);
    
    const config = await fetchConfig();
    if (config?.internal_logs_active) {
      await supabase.from('system_logs').insert({
        level: 'warn',
        message,
        details
      }).catch(err => console.error("Failed to persist log", err));
    }
  },

  error: async (message: string, error: any = {}) => {
    console.error(`[ERROR] ${message}`, error);
    
    const config = await fetchConfig();
    
    // Capture in Sentry if active
    if (config?.sentry_active) {
      Sentry.captureException(error instanceof Error ? error : new Error(message), {
        extra: { message, originalError: error }
      });
    }

    // Persist in DB if enabled
    if (config?.internal_logs_active) {
      await supabase.from('system_logs').insert({
        level: 'error',
        message,
        details: { 
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        }
      }).catch(err => console.error("Failed to persist error log", err));
    }
  }
};
