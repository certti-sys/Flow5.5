import { useMemo } from 'react';
import { useSupabaseWebhooks } from './useSupabaseWebhooks';
import { format, subDays, startOfDay } from 'date-fns';

export interface WebhooksByPeriod {
  date: string;
  success: number;
  error: number;
  total: number;
}

export interface SalesByPlatform {
  platform: string;
  sales: number;
  percentage: number;
  color: string;
}

export interface SalesByCourse {
  courseId: string;
  courseName: string;
  sales: number;
}

export interface ConversionData {
  date: string;
  rate: number;
}

export interface RecentError {
  id: string;
  platform: string;
  message: string;
  createdAt: string;
  buyerEmail: string | null;
}

const platformColors: Record<string, string> = {
  hotmart: '#F26522',
  kiwify: '#00C1A4',
  monetizze: '#FF6B35',
  eduzz: '#00A8E8',
  bripe: '#8B5CF6',
  outro: '#6B7280',
};

export function useWebhookAnalytics() {
  const { webhookLogs, isLoading } = useSupabaseWebhooks();

  // Total de webhooks recebidos
  const totalWebhooks = useMemo(() => webhookLogs.length, [webhookLogs]);

  // Taxa de sucesso
  const successRate = useMemo(() => {
    if (webhookLogs.length === 0) return 0;
    const successCount = webhookLogs.filter(log => log.status === 'success').length;
    return Math.round((successCount / webhookLogs.length) * 100);
  }, [webhookLogs]);

  // Total de vendas processadas
  const totalSales = useMemo(() => {
    return webhookLogs.filter(log => log.status === 'success').length;
  }, [webhookLogs]);

  // Tempo médio de resposta (simulado - na prática seria medido no edge function)
  const avgResponseTime = useMemo(() => {
    return '< 2s';
  }, []);

  // Webhooks por período (últimos N dias)
  const getWebhooksByPeriod = (days: number = 30): WebhooksByPeriod[] => {
    const result: Record<string, { success: number; error: number; total: number }> = {};
    
    // Inicializar todos os dias do período
    for (let i = 0; i < days; i++) {
      const date = format(startOfDay(subDays(new Date(), i)), 'yyyy-MM-dd');
      result[date] = { success: 0, error: 0, total: 0 };
    }

    // Agrupar logs por dia
    webhookLogs.forEach(log => {
      const date = format(startOfDay(new Date(log.created_at)), 'yyyy-MM-dd');
      if (result[date]) {
        result[date].total++;
        if (log.status === 'success') {
          result[date].success++;
        } else {
          result[date].error++;
        }
      }
    });

    // Converter para array e ordenar
    return Object.entries(result)
      .map(([date, data]) => ({
        date: format(new Date(date), 'dd/MM'),
        ...data,
      }))
      .reverse();
  };

  // Vendas por plataforma
  const salesByPlatform = useMemo((): SalesByPlatform[] => {
    const platformCounts: Record<string, number> = {};
    
    webhookLogs
      .filter(log => log.status === 'success')
      .forEach(log => {
        const platform = log.platform.toLowerCase();
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });

    const total = Object.values(platformCounts).reduce((sum, count) => sum + count, 0);

    return Object.entries(platformCounts)
      .map(([platform, sales]) => ({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        sales,
        percentage: total > 0 ? Math.round((sales / total) * 100) : 0,
        color: platformColors[platform] || platformColors.outro,
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [webhookLogs]);

  // Vendas por curso (top 5)
  const salesByCourse = useMemo((): SalesByCourse[] => {
    const courseCounts: Record<string, { count: number; name: string }> = {};
    
    webhookLogs
      .filter(log => log.status === 'success' && log.course_id)
      .forEach(log => {
        if (log.course_id) {
          if (!courseCounts[log.course_id]) {
            courseCounts[log.course_id] = { count: 0, name: 'Curso' };
          }
          courseCounts[log.course_id].count++;
        }
      });

    return Object.entries(courseCounts)
      .map(([courseId, data]) => ({
        courseId,
        courseName: data.name,
        sales: data.count,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [webhookLogs]);

  // Taxa de conversão ao longo do tempo
  const conversionTrend = useMemo((): ConversionData[] => {
    const last7Days = getWebhooksByPeriod(7);
    
    return last7Days.map(day => ({
      date: day.date,
      rate: day.total > 0 ? Math.round((day.success / day.total) * 100) : 0,
    }));
  }, [webhookLogs]);

  // Erros recentes (últimos 5)
  const recentErrors = useMemo((): RecentError[] => {
    return webhookLogs
      .filter(log => log.status === 'error')
      .slice(0, 5)
      .map(log => ({
        id: log.id,
        platform: log.platform,
        message: log.message || 'Erro desconhecido',
        createdAt: log.created_at,
        buyerEmail: log.buyer_email,
      }));
  }, [webhookLogs]);

  return {
    isLoading,
    totalWebhooks,
    successRate,
    totalSales,
    avgResponseTime,
    getWebhooksByPeriod,
    salesByPlatform,
    salesByCourse,
    conversionTrend,
    recentErrors,
  };
}
