import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Database, 
  Download, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Trash2,
  FileJson,
  ShieldCheck,
  ShieldAlert,
  Search,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  getDataPreview,
  runFullMigration,
  clearLocalStorageAfterMigration,
  exportLocalStorageBackup,
  type MigrationResult,
  type MigrationSummary,
} from '@/utils/migrateToSupabase';
import { createTestData, hasLocalStorageData } from '@/utils/createTestData';
import { 
  runFullValidation, 
  hasLocalStorageDataForValidation,
  type ValidationResult,
  type ValidationItem,
} from '@/utils/validateMigration';
import {
  USE_DATABASE,
  markValidationPassed,
  markValidationFailed,
  getValidationStatus,
} from '@/config/dataSource';

export default function DataMigration() {
  const [preview] = useState(getDataPreview());
  const [isMigrating, setIsMigrating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [clearStorage, setClearStorage] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [migrationResults, setMigrationResults] = useState<MigrationSummary | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);
  const [validationBlocked, setValidationBlocked] = useState(false);
  
  // Status atual da validação e flag
  const validationStatus = getValidationStatus();

  const handleExportBackup = () => {
    try {
      const backup = exportLocalStorageBackup();
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memberhero-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar backup');
      console.error(error);
    }
  };

  const handleCreateTestData = () => {
    try {
      const results = createTestData();
      toast.success('Dados de teste criados com sucesso!');
      console.log('Dados criados:', results);
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error('Erro ao criar dados de teste');
      console.error(error);
    }
  };

  const handleStartMigration = async () => {
    setShowConfirmDialog(false);
    setIsMigrating(true);
    setProgress(0);
    setCurrentStep('Iniciando migração...');
    setMigrationResults(null);
    setValidationResults(null);
    setValidationBlocked(false);

    try {
      const results = await runFullMigration((step, prog) => {
        setCurrentStep(step);
        setProgress(prog * 0.9); // 90% for migration
      });

      setMigrationResults(results);

      if (results.success) {
        // Run validation automatically after successful migration
        setCurrentStep('Validando migração...');
        setProgress(92);
        
        const validation = await runFullValidation((step, prog) => {
          setCurrentStep(step);
          setProgress(90 + (prog * 0.1)); // Last 10% for validation
        });
        
        setValidationResults(validation);
        
        if (validation.success) {
          // MARCAR VALIDAÇÃO COMO PASSOU
          markValidationPassed();
          toast.success('Migração e validação concluídas com sucesso!');
          
          if (clearStorage) {
            clearLocalStorageAfterMigration();
            toast.info('localStorage limpo com sucesso!');
          }
        } else {
          // BLOQUEIO: Validação falhou
          markValidationFailed();
          setValidationBlocked(true);
          toast.error('BLOQUEADO: Divergências encontradas na validação!');
        }
      } else {
        toast.error('Migração concluída com erros. Verifique os detalhes.');
      }
    } catch (error: any) {
      toast.error('Erro durante a migração: ' + error.message);
      console.error(error);
    } finally {
      setIsMigrating(false);
    }
  };

  // Executar validação manual
  const handleRunValidation = async () => {
    setIsValidating(true);
    setProgress(0);
    setCurrentStep('Iniciando validação...');
    setValidationResults(null);
    setValidationBlocked(false);

    try {
      const validation = await runFullValidation((step, prog) => {
        setCurrentStep(step);
        setProgress(prog);
      });
      
      setValidationResults(validation);
      
      if (validation.success) {
        markValidationPassed();
        toast.success('Validação concluída: 100% de equivalência!');
      } else {
        markValidationFailed();
        setValidationBlocked(true);
        toast.error('BLOQUEADO: Divergências encontradas!');
      }
    } catch (error: any) {
      toast.error('Erro durante a validação: ' + error.message);
      console.error(error);
    } finally {
      setIsValidating(false);
    }
  };

  const hasData = preview.total > 0;
  const canClearStorage = !validationBlocked && migrationResults?.success && validationResults?.success;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Migração de Dados</h1>
            <p className="text-white/70 mt-1">
              Transfira seus dados do localStorage para o Supabase
            </p>
          </div>
          <Button 
            onClick={handleExportBackup}
            variant="outline"
            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
            disabled={!hasData}
          >
            <Download className="mr-2 h-4 w-4" />
            Backup JSON
          </Button>
        </div>

        {/* Status da Flag USE_DATABASE */}
        <Card className="bg-[#0A0A0A] border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#D4AF37] flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Status da Fonte de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Flag USE_DATABASE */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-white/60">Flag USE_DATABASE</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={USE_DATABASE ? "default" : "secondary"} className={USE_DATABASE ? "bg-green-500" : "bg-gray-500"}>
                    {USE_DATABASE ? "ATIVADA" : "DESATIVADA"}
                  </Badge>
                  <span className="text-xs text-white/40">
                    {USE_DATABASE ? "Lendo do banco" : "Lendo do localStorage"}
                  </span>
                </div>
              </div>

              {/* Status da Validação */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-white/60">Status da Validação</span>
                </div>
                <div className="flex items-center gap-2">
                  {validationStatus.status === 'passed' && (
                    <Badge className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      PASSOU
                    </Badge>
                  )}
                  {validationStatus.status === 'failed' && (
                    <Badge className="bg-red-500">
                      <XCircle className="h-3 w-3 mr-1" />
                      FALHOU
                    </Badge>
                  )}
                  {validationStatus.status === 'pending' && (
                    <Badge className="bg-yellow-500">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      PENDENTE
                    </Badge>
                  )}
                </div>
              </div>

              {/* Fonte Ativa */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-white/60">Fonte Ativa</span>
                </div>
                <div className="flex items-center gap-2">
                  {USE_DATABASE && validationStatus.status === 'passed' ? (
                    <Badge className="bg-blue-500">
                      <Database className="h-3 w-3 mr-1" />
                      Supabase
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-500">
                      <FileJson className="h-3 w-3 mr-1" />
                      localStorage
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {validationStatus.timestamp && (
              <p className="text-xs text-white/40">
                Última validação: {new Date(validationStatus.timestamp).toLocaleString('pt-BR')}
              </p>
            )}

            {!USE_DATABASE && validationStatus.status === 'passed' && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-500">Pronto para ativar!</AlertTitle>
                <AlertDescription className="text-white/70">
                  A validação passou com 100% de equivalência. Para ativar a leitura do banco, altere <code className="bg-white/10 px-1 rounded">USE_DATABASE = true</code> em <code className="bg-white/10 px-1 rounded">src/config/dataSource.ts</code>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Alert se não houver dados */}
        {!hasData && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-500">Nenhum dado encontrado</AlertTitle>
            <AlertDescription className="text-white/70 space-y-3">
              <p>Não foram encontrados dados no localStorage para migrar. Certifique-se de ter cursos, módulos ou aulas cadastrados.</p>
              <Button
                onClick={handleCreateTestData}
                variant="outline"
                size="sm"
                className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Database className="mr-2 h-4 w-4" />
                Criar Dados de Teste
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview Card */}
        {hasData && (
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardHeader>
              <CardTitle className="text-[#D4AF37] flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Dados Disponíveis no localStorage
              </CardTitle>
              <CardDescription className="text-white/60">
                Visualize os dados que serão migrados para o Supabase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-[#D4AF37]">{preview.courses.count}</div>
                  <div className="text-sm text-white/70">Cursos</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-[#D4AF37]">{preview.modules.count}</div>
                  <div className="text-sm text-white/70">Módulos</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-[#D4AF37]">{preview.lessons.count}</div>
                  <div className="text-sm text-white/70">Aulas</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-[#D4AF37]">{preview.categories.count}</div>
                  <div className="text-sm text-white/70">Categorias</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-[#D4AF37]">{preview.tags.count}</div>
                  <div className="text-sm text-white/70">Tags</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-[#D4AF37]">{preview.shelves.count}</div>
                  <div className="text-sm text-white/70">Prateleiras</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-[#D4AF37]">
                    {preview.banner.exists ? '1' : '0'}
                  </div>
                  <div className="text-sm text-white/70">Banner</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-2xl font-bold text-[#D4AF37]">{preview.total}</div>
                  <div className="text-sm text-white/70">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Migration Controls */}
        {hasData && !migrationResults && (
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Configurações da Migração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="clear-storage" className="text-white">
                    Limpar localStorage após migração
                  </Label>
                  <p className="text-sm text-white/60">
                    Remove os dados do localStorage após a migração bem-sucedida
                  </p>
                </div>
                <Switch
                  id="clear-storage"
                  checked={clearStorage}
                  onCheckedChange={setClearStorage}
                />
              </div>

              <Button
                onClick={() => setShowConfirmDialog(true)}
                className="w-full bg-[#D4AF37] text-black hover:bg-[#F5D46E]"
                size="lg"
                disabled={isMigrating}
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Migrando...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-5 w-5" />
                    Iniciar Migração Completa
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Progress Card */}
        {isMigrating && (
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" />
                Progresso da Migração
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">{currentStep}</span>
                  <span className="text-[#D4AF37] font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Card */}
        {migrationResults && (
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {migrationResults.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Resultados da Migração
              </CardTitle>
              <CardDescription className="text-white/60">
                {migrationResults.summary.totalMigrated} itens migrados
                {migrationResults.summary.totalErrors > 0 && 
                  ` • ${migrationResults.summary.totalErrors} erros`
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary Badges */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="bg-green-500/10 border-green-500/50 text-green-500">
                  {migrationResults.summary.totalMigrated} migrados
                </Badge>
                {migrationResults.summary.totalErrors > 0 && (
                  <Badge variant="outline" className="bg-red-500/10 border-red-500/50 text-red-500">
                    {migrationResults.summary.totalErrors} erros
                  </Badge>
                )}
              </div>

              {/* Results by Entity */}
              <div className="space-y-2">
                {migrationResults.results.map((result: MigrationResult, index: number) => (
                  <Collapsible key={index}>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        {result.success && result.errors.length === 0 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <div className="text-white font-medium">{result.entity}</div>
                          <div className="text-sm text-white/60">
                            {result.count} item(s) • {result.errors.length} erro(s)
                          </div>
                        </div>
                      </div>
                      {result.errors.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-white/70">
                            Ver erros
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    {result.errors.length > 0 && (
                      <CollapsibleContent>
                        <div className="mt-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                          <ul className="space-y-1 text-sm text-red-400">
                            {result.errors.map((error, i) => (
                              <li key={i}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                ))}
              </div>

              {/* Actions */}
              {migrationResults.success && !validationResults && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-500">Migração concluída com sucesso!</AlertTitle>
                  <AlertDescription className="text-white/70">
                    Todos os dados foram transferidos para o Supabase. Você pode agora acessar o dashboard do Supabase para verificar os dados.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1"
                >
                  Atualizar Página
                </Button>
                {!clearStorage && canClearStorage && (
                  <Button
                    onClick={() => {
                      clearLocalStorageAfterMigration();
                      toast.success('localStorage limpo!');
                    }}
                    variant="outline"
                    className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar localStorage
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Results Card */}
        {validationResults && (
          <Card className={`bg-[#0A0A0A] border-2 ${validationBlocked ? 'border-red-500' : 'border-green-500/50'}`}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {validationResults.success ? (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                )}
                Validação Pós-Migração
              </CardTitle>
              <CardDescription className="text-white/60">
                {validationResults.summary.passed} de {validationResults.summary.totalChecks} verificações passaram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary Badges */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="bg-green-500/10 border-green-500/50 text-green-500">
                  {validationResults.summary.passed} passaram
                </Badge>
                {validationResults.summary.failed > 0 && (
                  <Badge variant="outline" className="bg-red-500/10 border-red-500/50 text-red-500">
                    {validationResults.summary.failed} falharam
                  </Badge>
                )}
              </div>

              {/* Validation Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-white/70">Entidade</th>
                      <th className="text-center py-2 px-3 text-white/70">Local</th>
                      <th className="text-center py-2 px-3 text-white/70">Banco</th>
                      <th className="text-center py-2 px-3 text-white/70">Status</th>
                      <th className="text-left py-2 px-3 text-white/70">IDs Faltando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResults.validations.map((validation: ValidationItem, index: number) => (
                      <tr key={index} className="border-b border-white/5">
                        <td className="py-2 px-3 text-white font-medium">{validation.entity}</td>
                        <td className="py-2 px-3 text-center text-[#D4AF37]">{validation.localCount}</td>
                        <td className="py-2 px-3 text-center text-[#D4AF37]">{validation.dbCount}</td>
                        <td className="py-2 px-3 text-center">
                          {validation.match ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="py-2 px-3 text-white/60 text-xs">
                          {validation.missingIds.length > 0 
                            ? validation.missingIds.slice(0, 2).map(id => id.slice(0, 8) + '...').join(', ')
                            : '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Critical Errors Alert */}
              {validationBlocked && validationResults.summary.criticalErrors.length > 0 && (
                <Alert className="border-red-500 bg-red-500/10">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  <AlertTitle className="text-red-500">⚠️ BLOQUEADO: Divergências Encontradas</AlertTitle>
                  <AlertDescription className="text-white/70">
                    <p className="mb-2">A migração não está 100% completa. Verifique os erros abaixo:</p>
                    <ul className="space-y-1 text-sm text-red-400 max-h-40 overflow-y-auto">
                      {validationResults.summary.criticalErrors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-yellow-500 font-medium">
                      O localStorage NÃO será limpo até que todas as divergências sejam resolvidas.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Alert */}
              {validationResults.success && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-500">✅ Validação 100% - Equivalência Total!</AlertTitle>
                  <AlertDescription className="text-white/70">
                    Todos os dados foram migrados corretamente. É seguro limpar o localStorage.
                  </AlertDescription>
                </Alert>
              )}

              {/* Manual Validation Button */}
              <Button
                onClick={handleRunValidation}
                variant="outline"
                className="w-full border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                disabled={isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Executar Validação Novamente
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Manual Validation Card (when no migration results) */}
        {!migrationResults && hasData && (
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-[#D4AF37]" />
                Validação Pós-Migração
              </CardTitle>
              <CardDescription className="text-white/60">
                Verifique se todos os dados foram migrados corretamente comparando localStorage com o banco
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleRunValidation}
                variant="outline"
                className="w-full border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                disabled={isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Executar Validação
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Validation Progress Card */}
        {isValidating && (
          <Card className="bg-[#0A0A0A] border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" />
                Progresso da Validação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">{currentStep}</span>
                  <span className="text-[#D4AF37] font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="bg-[#0A0A0A] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Confirmar Migração</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                Esta ação irá transferir {preview.total} itens do localStorage para o Supabase.
                {clearStorage && (
                  <span className="block mt-2 text-red-400">
                    ⚠️ O localStorage será limpo após a migração.
                  </span>
                )}
                <span className="block mt-2">
                  Recomendamos fazer um backup antes de continuar.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleStartMigration}
                className="bg-[#D4AF37] text-black hover:bg-[#F5D46E]"
              >
                Iniciar Migração
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
