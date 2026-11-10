import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useSupabaseWebhooks, platforms } from '@/hooks/useSupabaseWebhooks';
import { useCourses } from '@/hooks/useCourses';
import { ArrowLeft, Copy, Settings, ShoppingCart, CheckCircle, Activity, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

export default function WebhooksConfig() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    webhookConfigs,
    isLoading,
    getWebhookStats,
    getWebhookUrl,
    getLogsByCourse
  } = useSupabaseWebhooks();
  const {
    cursos
  } = useCourses();
  const [copied, setCopied] = useState<string | null>(null);
  const stats = getWebhookStats();
  const handleCopyUrl = (secretKey: string) => {
    const url = getWebhookUrl(secretKey);
    navigator.clipboard.writeText(url);
    setCopied(secretKey);
    toast.success('URL do webhook copiada');
    setTimeout(() => setCopied(null), 2000);
  };
  const getCourseName = (courseId: string) => {
    const course = cursos.find(c => c.id === courseId);
    return course?.titulo || 'Curso não encontrado';
  };
  const getPlatformInfo = (platform: string) => {
    return platforms.find(p => p.value === platform) || platforms[platforms.length - 1];
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings')} className="h-11 w-11 min-w-[44px]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">🔌 Integrações</h1>
            <p className="text-muted-foreground mt-1">
              Configure webhooks para liberar acesso automático após compras
            </p>
          </div>
        </div>
        <Button onClick={() => navigate('/admin/webhook-logs')} variant="outline" className="min-h-[44px] w-full sm:w-auto">
          Ver Logs Completos
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.active}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalSales}</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Sucesso</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Webhooks por Curso</CardTitle>
          <CardDescription>
            Webhooks configurados e vinculados a cursos específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webhookConfigs.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Nenhum webhook configurado</h3>
              <p className="text-muted-foreground mb-6">
                Configure webhooks na aba Configurações de cada curso
              </p>
              <Button onClick={() => navigate('/admin/courses')} className="min-h-[44px]">
                Ir para Cursos
              </Button>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {webhookConfigs.map(config => {
                const platform = getPlatformInfo(config.platform);
                const salesCount = getLogsByCourse(config.course_id).filter(l => l.status === 'success').length;
                return (
                  <div key={config.id} className="glass-card p-4 rounded-xl border border-border/50 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {getCourseName(config.course_id)}
                        </p>
                        <Badge variant="outline" className="mt-1" style={{
                          borderColor: platform.color,
                          color: platform.color
                        }}>
                          {platform.label}
                        </Badge>
                      </div>
                      {config.active ? (
                        <Badge variant="default" className="bg-green-500">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Vendas:</span>
                        <Badge variant="secondary">{salesCount}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleCopyUrl(config.secret_key)} className="h-11 w-11">
                          {copied === config.secret_key ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/courses/${config.course_id}?tab=configuracoes`)} className="h-11 w-11">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Curso</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookConfigs.map(config => {
                    const platform = getPlatformInfo(config.platform);
                    const salesCount = getLogsByCourse(config.course_id).filter(l => l.status === 'success').length;
                    return (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">
                          {getCourseName(config.course_id)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" style={{
                            borderColor: platform.color,
                            color: platform.color
                          }}>
                            {platform.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {config.external_product_id || '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{salesCount}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {config.active ? <Badge variant="default" className="bg-green-500">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleCopyUrl(config.secret_key)} className="h-10 w-10">
                              {copied === config.secret_key ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/courses/${config.course_id}?tab=configuracoes`)} className="h-10 w-10">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="text-xl">💡</span>
              Configure webhooks na aba <strong>Configurações</strong> de cada curso
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Integration Guides */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Como Integrar com as Plataformas</CardTitle>
          <CardDescription>
            Guias passo a passo para configurar webhooks em cada plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="hotmart">
              <AccordionTrigger className="min-h-[44px]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{
                  backgroundColor: '#F26522'
                }} />
                  <span className="font-semibold">Hotmart</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Acesse o <strong>Painel Hotmart</strong> → Produtos → Seu Produto</li>
                  <li>Vá em <strong>Configurações</strong> → <strong>Integrações</strong> → <strong>Webhooks</strong></li>
                  <li>Clique em <strong>Adicionar webhook</strong></li>
                  <li>Cole a URL do webhook gerada no MemberHero</li>
                  <li>Selecione os eventos: <code>purchase.approved</code></li>
                  <li>Salve e teste o webhook</li>
                </ol>
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">
                    <strong>Dica:</strong> O email do comprador virá no campo <code>buyer.email</code>
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="kiwify">
              <AccordionTrigger className="min-h-[44px]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{
                  backgroundColor: '#00C1A4'
                }} />
                  <span className="font-semibold">Kiwify</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Acesse o <strong>Dashboard Kiwify</strong> → Produtos</li>
                  <li>Selecione seu produto → <strong>Webhooks</strong></li>
                  <li>Clique em <strong>Novo Webhook</strong></li>
                  <li>Cole a URL do webhook do MemberHero</li>
                  <li>Ative os eventos: <code>order.paid</code></li>
                  <li>Salve a configuração</li>
                </ol>
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">
                    <strong>Dica:</strong> O email virá em <code>Customer.email</code>
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cakto">
              <AccordionTrigger className="min-h-[44px]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{
                  backgroundColor: '#7C3AED'
                }} />
                  <span className="font-semibold">Cakto</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Acesse o <strong>Painel Cakto</strong> → Produtos</li>
                  <li>Selecione seu produto → <strong>Integrações</strong></li>
                  <li>Clique em <strong>Adicionar Webhook</strong></li>
                  <li>Cole a URL do webhook gerada no MemberHero</li>
                  <li>Selecione os eventos de compra aprovada</li>
                  <li>Salve e teste a integração</li>
                </ol>
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">
                    <strong>Dica:</strong> O email do comprador virá no campo de dados do cliente
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}