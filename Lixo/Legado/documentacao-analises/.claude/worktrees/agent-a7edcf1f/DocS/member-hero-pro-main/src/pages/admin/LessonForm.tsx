import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  Video, 
  FileText, 
  File, 
  Link2, 
  Upload, 
  X, 
  Minus, 
  Plus,
  ArrowLeft,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLessons, converterParaBase64, Lesson } from '@/hooks/useLessons';
import { useModules } from '@/hooks/useModules';
import { detectVideoSource, isValidEmbed, getVideoSourceLabel } from '@/utils/videoSourceDetector';
import { VideoPreview } from '@/components/admin/course/VideoPreview';

type TipoConteudo = 'video' | 'pdf' | 'arquivo' | 'externo' | 'panda_video' | 'host_vsl';

const tiposConteudo: { value: TipoConteudo; label: string; icon: React.ElementType }[] = [
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'arquivo', label: 'Arquivo', icon: File },
  { value: 'externo', label: 'Link Externo', icon: Link2 },
];

export default function LessonForm() {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get('moduleId') || '';
  const courseId = searchParams.get('courseId') || '';
  
  const { toast } = useToast();
  const { obterAula, criarAula, editarAula, obterAulasPorModulo } = useLessons();
  const { obterModulo } = useModules();
  
  const isEditing = Boolean(lessonId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const extrasInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoConteudo>('video');
  const [url, setUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [arquivo, setArquivo] = useState('');
  const [arquivoNome, setArquivoNome] = useState('');
  const [materiaisExtras, setMateriaisExtras] = useState<string[]>([]);
  const [materiaisExtrasNomes, setMateriaisExtrasNomes] = useState<string[]>([]);
  const [status, setStatus] = useState<'Publicado' | 'Rascunho'>('Rascunho');
  const [ordem, setOrdem] = useState(1);
  const [moduloInfo, setModuloInfo] = useState<{ id: string; cursoId: string } | null>(null);

  // Load existing lesson data if editing
  useEffect(() => {
    if (isEditing && lessonId) {
      const aula = obterAula(lessonId);
      if (aula) {
        setNome(aula.nome);
        setDescricao(aula.descricao);
        setTipo(aula.tipo);
        setUrl(aula.url);
        setThumbnail(aula.thumbnail);
        setArquivo(aula.arquivo);
        setMateriaisExtras(aula.materiaisExtras);
        setStatus(aula.status);
        setOrdem(aula.ordem);
        setModuloInfo({ id: aula.moduloId, cursoId: aula.cursoId });
      }
    } else if (moduleId) {
      // Set default order based on existing lessons
      const aulasModulo = obterAulasPorModulo(moduleId);
      setOrdem(aulasModulo.length + 1);
      
      const modulo = obterModulo(moduleId);
      if (modulo) {
        setModuloInfo({ id: moduleId, cursoId: modulo.cursoId });
      } else if (courseId) {
        setModuloInfo({ id: moduleId, cursoId: courseId });
      }
    }
  }, [isEditing, lessonId, moduleId, courseId]);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await converterParaBase64(file);
        setThumbnail(base64);
      } catch (error) {
        toast({
          title: 'Erro ao carregar imagem',
          description: 'Não foi possível processar a imagem.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await converterParaBase64(file);
        setArquivo(base64);
        setArquivoNome(file.name);
      } catch (error) {
        toast({
          title: 'Erro ao carregar arquivo',
          description: 'Não foi possível processar o arquivo.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleExtrasUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      try {
        const novosExtras: string[] = [];
        const novosNomes: string[] = [];
        
        for (let i = 0; i < files.length; i++) {
          const base64 = await converterParaBase64(files[i]);
          novosExtras.push(base64);
          novosNomes.push(files[i].name);
        }
        
        setMateriaisExtras(prev => [...prev, ...novosExtras]);
        setMateriaisExtrasNomes(prev => [...prev, ...novosNomes]);
      } catch (error) {
        toast({
          title: 'Erro ao carregar arquivos',
          description: 'Não foi possível processar os arquivos.',
          variant: 'destructive',
        });
      }
    }
  };

  const removerMaterialExtra = (index: number) => {
    setMateriaisExtras(prev => prev.filter((_, i) => i !== index));
    setMateriaisExtrasNomes(prev => prev.filter((_, i) => i !== index));
  };

  const validarCampos = (): boolean => {
    if (!nome.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Digite o nome da aula.',
        variant: 'destructive',
      });
      return false;
    }

    if ((tipo === 'video' || tipo === 'externo') && !url.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Digite a URL do conteúdo.',
        variant: 'destructive',
      });
      return false;
    }

    if ((tipo === 'pdf' || tipo === 'arquivo') && !arquivo) {
      toast({
        title: 'Campo obrigatório',
        description: 'Faça upload do arquivo.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSalvar = () => {
    if (!validarCampos()) return;

    const dadosAula = {
      moduloId: moduloInfo?.id || moduleId,
      cursoId: moduloInfo?.cursoId || courseId,
      nome,
      descricao,
      tipo,
      url,
      thumbnail,
      arquivo,
      materiaisExtras,
      status,
      ordem,
    };

    try {
      if (isEditing && lessonId) {
        editarAula(lessonId, dadosAula);
        toast({
          title: 'Aula atualizada',
          description: 'As alterações foram salvas com sucesso.',
        });
      } else {
        criarAula(dadosAula);
        toast({
          title: 'Aula criada',
          description: 'A aula foi criada com sucesso.',
        });
      }
      navigate(-1);
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a aula.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-white/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditing ? 'Editar Aula' : 'Criar Aula'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="border-white/10 hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSalvar}
            className="gold-button px-6"
          >
            Salvar Aula
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detalhes da Aula */}
          <div className="glass-card rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Detalhes da Aula</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Aula</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite o nome da aula..."
                  className="bg-white/5 border-white/10 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição da Aula</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Adicione uma descrição detalhada desta aula..."
                  className="bg-white/5 border-white/10 focus:border-primary min-h-[120px]"
                />
              </div>
            </div>
          </div>

          {/* Tipo de Conteúdo */}
          <div className="glass-card rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Tipo de Conteúdo</h2>
            
            {/* Radio Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {tiposConteudo.map((item) => {
                const Icon = item.icon;
                const isSelected = tipo === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => setTipo(item.value)}
                    className={`
                      flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                      border transition-all duration-200
                      ${isSelected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-white/5 border-white/10 hover:border-primary/50 text-foreground'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Conditional Fields */}
            <div className="space-y-6">
              {/* Video Fields */}
              {tipo === 'video' && (() => {
                const detectedSource = url.trim() ? (() => {
                  try {
                    return detectVideoSource(url);
                  } catch {
                    return null;
                  }
                })() : null;
                
                const embedValidation = detectedSource?.isEmbed ? isValidEmbed(url) : null;

                return (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="url">URL ou Código Embed</Label>
                      <Textarea
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Cole a URL (YouTube, Vimeo) ou código embed (Panda Video, Host VSL)"
                        rows={url.includes('<iframe') ? 4 : 1}
                        className="bg-white/5 border-white/10 focus:border-primary resize-none"
                      />
                      
                      {/* Feedback de detecção automática */}
                      {detectedSource && (
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={embedValidation?.valid === false ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {embedValidation?.valid === false ? (
                              <>⚠️ {embedValidation.error}</>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Detectado: {getVideoSourceLabel(detectedSource.type)}
                              </>
                            )}
                          </Badge>
                        </div>
                      )}

                      {/* Preview do Vídeo */}
                      {url.trim() && (
                        <div className="space-y-2 mt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            <span>Preview do Vídeo</span>
                          </div>
                          <VideoPreview
                            url={url}
                            detectedSource={detectedSource}
                            isValid={embedValidation?.valid !== false}
                          />
                        </div>
                      )}
                    </div>
                  
                  <div className="space-y-2">
                    <Label>Miniatura da Aula (Opcional)</Label>
                    <input
                      type="file"
                      ref={thumbnailInputRef}
                      onChange={handleThumbnailUpload}
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                    />
                    {thumbnail ? (
                      <div className="relative rounded-xl overflow-hidden">
                        <img 
                          src={thumbnail} 
                          alt="Miniatura" 
                          className="w-full h-48 object-cover"
                        />
                        <button
                          onClick={() => setThumbnail('')}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-white/20 rounded-xl p-8 
                          hover:border-primary/50 transition-colors cursor-pointer 
                          flex flex-col items-center justify-center gap-2"
                      >
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <span className="text-foreground">Clique para upload ou arraste</span>
                        <span className="text-xs text-muted-foreground">PNG, JPG (1280x720px recomendado)</span>
                      </button>
                    )}
                  </div>
                </>
              );
            })()}

              {/* PDF/Arquivo Fields */}
              {(tipo === 'pdf' || tipo === 'arquivo') && (
                <div className="space-y-2">
                  <Label>Upload de Arquivo</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept={tipo === 'pdf' ? '.pdf' : '.pdf,.zip,.docx,.doc'}
                    className="hidden"
                  />
                  {arquivo ? (
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" />
                        <span className="text-foreground">{arquivoNome || 'Arquivo carregado'}</span>
                      </div>
                      <button
                        onClick={() => { setArquivo(''); setArquivoNome(''); }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-white/20 rounded-xl p-8 
                        hover:border-primary/50 transition-colors cursor-pointer 
                        flex flex-col items-center justify-center gap-2"
                    >
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-foreground">Clique para upload ou arraste</span>
                      <span className="text-xs text-muted-foreground">
                        {tipo === 'pdf' ? 'PDF' : 'PDF, ZIP, DOCX'}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Link Externo Fields */}
              {tipo === 'externo' && (
                <div className="space-y-2">
                  <Label htmlFor="urlExterna">URL Externa</Label>
                  <Input
                    id="urlExterna"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Cole a URL externa..."
                    className="bg-white/5 border-white/10 focus:border-primary"
                  />
                </div>
              )}

              {/* Materiais Extras - Always visible */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                <Label>Materiais Extras (Opcional)</Label>
                <input
                  type="file"
                  ref={extrasInputRef}
                  onChange={handleExtrasUpload}
                  accept=".pdf,.zip,.doc,.docx"
                  multiple
                  className="hidden"
                />
                
                {materiaisExtras.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {materiaisExtrasNomes.map((nome, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <File className="w-5 h-5 text-primary" />
                          <span className="text-sm text-foreground">{nome}</span>
                        </div>
                        <button
                          onClick={() => removerMaterialExtra(index)}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => extrasInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-white/20 rounded-xl p-6 
                    hover:border-primary/50 transition-colors cursor-pointer 
                    flex flex-col items-center justify-center gap-2"
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-foreground">Adicionar anexos</span>
                  <span className="text-xs text-muted-foreground">PDF, ZIP, DOC</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="glass-card rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Status da Aula</h2>
            <div className="flex items-center justify-between">
              <span className="text-foreground">
                {status === 'Publicado' ? 'Publicado' : 'Rascunho'}
              </span>
              <Switch
                checked={status === 'Publicado'}
                onCheckedChange={(checked) => setStatus(checked ? 'Publicado' : 'Rascunho')}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {status === 'Publicado' 
                ? 'A aula está visível para os alunos' 
                : 'A aula está oculta para os alunos'}
            </p>
          </div>

          {/* Ordem */}
          <div className="glass-card rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Ordem da Aula</h2>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setOrdem(Math.max(1, ordem - 1))}
                className="border-white/10 hover:bg-white/5"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-12 text-center font-bold text-2xl text-foreground">
                {ordem}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setOrdem(ordem + 1)}
                className="border-white/10 hover:bg-white/5"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Posição da aula no módulo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
