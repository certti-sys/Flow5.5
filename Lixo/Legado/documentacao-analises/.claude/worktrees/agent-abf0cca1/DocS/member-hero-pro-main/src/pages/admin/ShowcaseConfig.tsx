import { useState, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { ShowcasePreview } from '@/components/admin/showcase/ShowcasePreview';
import { useSupabaseBannerPrincipal } from '@/hooks/useSupabaseBannerPrincipal';
import { useSupabaseCardsSettings } from '@/hooks/useSupabaseCardsSettings';
import { useSupabaseBannersSecundarios, BannerSecundario } from '@/hooks/useSupabaseBannersSecundarios';
import { useShelves, Shelf } from '@/hooks/useSupabaseShelves';
import { useCourses } from '@/hooks/useSupabaseCourses';
import { useCategories } from '@/hooks/useSupabaseCategories';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Upload, Trash2, Save, Plus, Edit, GripVertical, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
function SortableBannerItem({
  banner,
  onEdit,
  onDelete,
  onToggle,
  getStatus
}: {
  banner: BannerSecundario;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  getStatus: (banner: BannerSecundario) => {
    status: string;
    label: string;
    emoji: string;
  };
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({
    id: banner.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  const statusInfo = getStatus(banner);
  return <div ref={setNodeRef} style={style} className="bg-surface/50 backdrop-blur-sm border border-white/10 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gold hover:text-gold-light min-w-[44px] min-h-[44px] flex items-center justify-center">
          <GripVertical className="w-5 h-5" />
        </button>
        
        <div className="w-20 h-14 sm:w-24 sm:h-16 bg-black/50 rounded border border-white/10 overflow-hidden flex-shrink-0">
          {banner.imagem_url ? <img src={banner.imagem_url} alt="Preview" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-white/30" />
            </div>}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{banner.nome || `Banner ${banner.ordem}`}</p>
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-1">
          <span className="text-xs text-white/60 capitalize">{banner.posicao.replace('_', ' ')}</span>
          <span className="text-xs text-white/60 hidden sm:inline">•</span>
          <span className="text-xs text-white/60 capitalize">{banner.tipo}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm">
            {statusInfo.emoji} <span className={cn("font-medium text-xs", statusInfo.status === 'ativo' && "text-green-400", statusInfo.status === 'agendado' && "text-yellow-400", statusInfo.status === 'expirado' && "text-red-400", statusInfo.status === 'desativado' && "text-white/40")}>{statusInfo.label}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <Switch checked={banner.ativo} onCheckedChange={onToggle} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="h-10 w-10 min-h-[44px] min-w-[44px] p-0 border-gold/30 hover:bg-gold/10">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="h-10 w-10 min-h-[44px] min-w-[44px] p-0 border-red-500/30 hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>;
}
function SortableShelfItem({
  shelf,
  onEdit,
  onDelete,
  onToggle,
  getCategoryName
}: {
  shelf: Shelf;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  getCategoryName: (id?: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({
    id: shelf.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return <div ref={setNodeRef} style={style} className="bg-surface/50 backdrop-blur-sm border border-white/10 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gold hover:text-gold-light min-w-[44px] min-h-[44px] flex items-center justify-center">
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{shelf.titulo}</p>
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-1">
            <span className="text-xs text-white/60 capitalize">
              {shelf.tipo === 'categoria' ? 'Por Categoria' : shelf.tipo}
            </span>
            {shelf.tipo === 'manual' && shelf.cursosIds && <>
                <span className="text-xs text-white/60 hidden sm:inline">•</span>
                <span className="text-xs text-white/60">{shelf.cursosIds.length} cursos</span>
              </>}
            {shelf.tipo === 'categoria' && shelf.categoriaId && <>
                <span className="text-xs text-white/60 hidden sm:inline">•</span>
                <span className="text-xs text-gold">{getCategoryName(shelf.categoriaId)}</span>
              </>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 mt-2 sm:mt-0 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
          <Switch checked={shelf.ativo} onCheckedChange={onToggle} />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="h-10 w-10 min-h-[44px] min-w-[44px] p-0 border-gold/30 hover:bg-gold/10">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="h-10 w-10 min-h-[44px] min-w-[44px] p-0 border-red-500/30 hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>;
}
export default function ShowcaseConfig() {
  const navigate = useNavigate();
  const {
    banner,
    uploadBanner,
    removeBanner,
    toggleExibir,
    updateBanner,
    isSaving: isSavingBanner
  } = useSupabaseBannerPrincipal();
  const {
    settings,
    updateSettings,
    isLoading: isLoadingSettings
  } = useSupabaseCardsSettings();
  const {
    banners,
    addBanner,
    updateBanner: updateBannerSec,
    deleteBanner,
    reorderBanners,
    uploadBannerImage,
    isBannerAtivo
  } = useSupabaseBannersSecundarios();
  
  const getBannerStatus = (banner: BannerSecundario) => {
    if (!banner.ativo) {
      return { status: 'desativado', label: 'Desativado', emoji: '⚫' };
    }
    if (!banner.agendamento_habilitado) {
      return { status: 'ativo', label: 'Ativo', emoji: '🟢' };
    }
    const isActive = isBannerAtivo(banner);
    if (isActive) {
      return { status: 'ativo', label: 'Agendado (Ativo)', emoji: '🟢' };
    }
    const now = new Date();
    const dataInicio = banner.agendamento_data_inicio ? new Date(banner.agendamento_data_inicio) : null;
    if (dataInicio && now < dataInicio) {
      return { status: 'agendado', label: 'Agendado', emoji: '🔵' };
    }
    return { status: 'expirado', label: 'Expirado', emoji: '🔴' };
  };
  const {
    shelves,
    addShelf,
    updateShelf,
    deleteShelf,
    reorderShelves
  } = useShelves();
  const {
    cursos
  } = useCourses();
  const { categories } = useCategories();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Preview states
  const [showPreview, setShowPreview] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const handleOpenNewTab = () => {
    window.open('/student', '_blank');
  };

  // Banner Secundário Dialog
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerSecundario | null>(null);
  const [bannerFormData, setBannerFormData] = useState<Partial<BannerSecundario>>({
    nome: '',
    posicao: 'antes',
    tipo: 'estatico',
    ativo: true,
    exibir_vitrine: true,
    exibir_comunidade: false,
    agendamento_habilitado: false,
    agendamento_data_inicio: undefined,
    agendamento_hora_inicio: '00:00',
    agendamento_data_fim: undefined,
    agendamento_hora_fim: '23:59'
  });
  const bannerSecInputRef = useRef<HTMLInputElement>(null);

  // Shelf Dialog
  const [shelfDialogOpen, setShelfDialogOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [shelfFormData, setShelfFormData] = useState<Partial<Shelf>>({
    titulo: '',
    tipo: 'automatica',
    ativo: true,
    cursosIds: [],
    categoriaId: undefined
  });
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Arquivo muito grande', {
        description: 'O arquivo deve ter no máximo 3 MB'
      });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido', {
        description: 'Use JPG, PNG ou WEBP'
      });
      return;
    }
    setIsUploadingBanner(true);
    try {
      await uploadBanner(file);
      toast.success('Banner carregado com sucesso');
    } catch (error) {
      toast.error('Erro ao carregar banner');
    } finally {
      setIsUploadingBanner(false);
    }
  };
  const handleRemoveBanner = async () => {
    await removeBanner();
    toast.success('Banner removido');
  };
  const handleSaveCardsSettings = () => {
    toast.success('Configurações salvas');
  };
  const handleBannerSecUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Arquivo muito grande', {
        description: 'O arquivo deve ter no máximo 3 MB'
      });
      return;
    }
    try {
      const url = await uploadBannerImage(file);
      setBannerFormData({
        ...bannerFormData,
        imagem_url: url
      });
      toast.success('Imagem carregada');
    } catch (error) {
      toast.error('Erro ao carregar imagem');
    }
  };
  const handleSaveBanner = async () => {
    if (!bannerFormData.imagem_url) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (bannerFormData.agendamento_habilitado) {
      if (!bannerFormData.agendamento_data_inicio || !bannerFormData.agendamento_data_fim) {
        toast.error('Defina as datas de início e término do agendamento');
        return;
      }
    }
    
    try {
      if (editingBanner) {
        await updateBannerSec(editingBanner.id, bannerFormData);
      } else {
        await addBanner(bannerFormData as any);
      }
      
      setBannerDialogOpen(false);
      setEditingBanner(null);
      setBannerFormData({
        nome: '',
        posicao: 'antes',
        tipo: 'estatico',
        ativo: true,
        exibir_vitrine: true,
        exibir_comunidade: false,
        agendamento_habilitado: false,
        agendamento_data_inicio: undefined,
        agendamento_hora_inicio: '00:00',
        agendamento_data_fim: undefined,
        agendamento_hora_fim: '23:59'
      });
    } catch (error) {
      console.error('Erro ao salvar banner:', error);
    }
  };
  const handleEditBanner = (banner: BannerSecundario) => {
    setEditingBanner(banner);
    setBannerFormData(banner);
    setBannerDialogOpen(true);
  };
  const handleDeleteBanner = (id: string) => {
    deleteBanner(id);
    toast.success('Banner removido');
  };
  const handleToggleBanner = (id: string, ativo: boolean) => {
    updateBannerSec(id, {
      ativo
    });
  };
  const handleDragEndBanners = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = banners.findIndex(b => b.id === active.id);
    const newIndex = banners.findIndex(b => b.id === over.id);
    reorderBanners(arrayMove(banners, oldIndex, newIndex));
  };
  const handleSaveShelf = () => {
    if (!shelfFormData.titulo?.trim()) {
      toast.error('Digite o nome da prateleira');
      return;
    }
    if (shelfFormData.tipo === 'categoria' && !shelfFormData.categoriaId) {
      toast.error('Selecione uma categoria');
      return;
    }
    if (editingShelf) {
      updateShelf(editingShelf.id, shelfFormData);
      toast.success('Prateleira atualizada');
    } else {
      addShelf(shelfFormData as Omit<Shelf, 'id' | 'ordem'>);
      toast.success('Prateleira adicionada');
    }
    setShelfDialogOpen(false);
    setEditingShelf(null);
    setShelfFormData({
      titulo: '',
      tipo: 'automatica',
      ativo: true,
      cursosIds: [],
      categoriaId: undefined
    });
  };
  const handleEditShelf = (shelf: Shelf) => {
    setEditingShelf(shelf);
    setShelfFormData(shelf);
    setShelfDialogOpen(true);
  };
  const handleDeleteShelf = (id: string) => {
    deleteShelf(id);
    toast.success('Prateleira removida');
  };
  const handleToggleShelf = (id: string, ativo: boolean) => {
    updateShelf(id, {
      ativo
    });
  };
  const handleDragEndShelves = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = shelves.findIndex(s => s.id === active.id);
    const newIndex = shelves.findIndex(s => s.id === over.id);
    reorderShelves(arrayMove(shelves, oldIndex, newIndex));
  };
  const handleToggleCourse = (courseId: string) => {
    const currentIds = shelfFormData.cursosIds || [];
    const newIds = currentIds.includes(courseId) ? currentIds.filter(id => id !== courseId) : [...currentIds, courseId];
    setShelfFormData({
      ...shelfFormData,
      cursosIds: newIds
    });
  };
  
  const getCategoryName = (id?: string) => {
    if (!id) return '';
    const category = categories.find(c => c.id === id);
    return category?.nome || '';
  };
  const publishedCoursesCount = cursos.filter(c => c.status === 'Publicado').length;
  const activeShelvesCount = shelves.filter(s => s.ativo).length;
  const isMobile = useIsMobile();
  
  return <div className="space-y-6 w-full">
        {/* Header com Status Compacto */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gold">Configuração da Vitrine</h1>
              <p className="text-white/60 mt-1 text-sm sm:text-base">Configure banner, cards e prateleiras da área do aluno</p>
            </div>
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)} className="min-h-[44px] w-full sm:w-auto flex items-center justify-center gap-2">
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'Esconder' : 'Mostrar'} Preview
            </Button>
          </div>

          {/* Status Compacto - Grid Responsivo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 p-4 bg-black/20 rounded-lg border border-white/10">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-white/60 text-sm">Cursos Publicados:</span>
              <span className="text-gold font-bold text-lg">{publishedCoursesCount}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-white/60 text-sm">Prateleiras Ativas:</span>
              <span className="text-gold font-bold text-lg">{activeShelvesCount}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <span className="text-white/60 text-sm">Banner Principal:</span>
              <span className={cn("font-bold text-lg", banner.imagemUrl && banner.exibir ? "text-green-400" : "text-white/40")}>
                {banner.imagemUrl && banner.exibir ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
        </div>

        {/* Layout: Configurações + Preview */}
        <div className={cn("grid gap-6 transition-all duration-300", showPreview && !isPreviewExpanded ? "lg:grid-cols-[500px,1fr]" : showPreview && isPreviewExpanded ? "lg:grid-cols-[400px,1fr]" : "grid-cols-1")}>
          {/* Coluna Esquerda: Tabs de configuração */}
          <Tabs defaultValue="banner" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto sm:grid sm:w-full sm:grid-cols-4 bg-black/30 border border-white/10 h-12">
            <TabsTrigger value="banner" className="min-h-[44px] whitespace-nowrap px-4 sm:px-2 data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
              <span className="sm:hidden">Banner</span>
              <span className="hidden sm:inline">Banner Principal</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="min-h-[44px] whitespace-nowrap px-4 sm:px-2 data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
              Cards
            </TabsTrigger>
            <TabsTrigger value="banners" className="min-h-[44px] whitespace-nowrap px-4 sm:px-2 data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
              <span className="sm:hidden">Promos</span>
              <span className="hidden sm:inline">Banners Promo</span>
            </TabsTrigger>
            <TabsTrigger value="shelves" className="min-h-[44px] whitespace-nowrap px-4 sm:px-2 data-[state=active]:bg-gold/20 data-[state=active]:text-gold">
              Prateleiras
            </TabsTrigger>
          </TabsList>
          </div>

          {/* TAB 1: Banner Principal */}
          <TabsContent value="banner" className="mt-6">

            <Card className="bg-surface/50 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-gold flex items-center gap-2 text-base sm:text-lg">
                  Banner Principal
                  <span className="hidden sm:inline text-gold/80">(Hero da Home)</span>
                </CardTitle>
                <CardDescription className="text-white/60 text-xs sm:text-sm">
                  Tamanho recomendado: 1920x500px • Formatos: JPG, PNG, WebP
                </CardDescription>
              </CardHeader>
          <CardContent className="space-y-6">
            {banner.imagemUrl ? <div className="space-y-4">
                <div className="relative w-full max-h-48 rounded-lg overflow-hidden border border-gold/20" style={{
                  aspectRatio: banner.aspectRatio === 'auto' ? `${banner.larguraOriginal || 1920}/${banner.alturaOriginal || 500}` : banner.aspectRatio?.replace('/', ' / ') || '21 / 9'
                }}>
                  <img src={banner.imagemUrl} alt="Banner Principal" className="w-full h-full" style={{
                    objectFit: banner.objectFit || 'cover'
                  }} />
                </div>
                
                {banner.larguraOriginal && banner.alturaOriginal && <div className="p-3 bg-black/20 rounded-lg border border-white/10">
                    <p className="text-sm text-white/60">
                      <span className="text-white font-medium">Dimensões:</span> {banner.larguraOriginal} x {banner.alturaOriginal}px 
                      <span className="text-gold ml-2">
                        (Proporção: {(banner.larguraOriginal / banner.alturaOriginal).toFixed(2)}:1)
                      </span>
                    </p>
                  </div>}

                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <Label className="text-sm font-medium text-white">
                    Modo de exibição do banner
                  </Label>
                  <Select value={banner.objectFit || 'cover'} onValueChange={(value: 'cover' | 'contain') => updateBanner({
                    objectFit: value
                  })}>
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Preencher (pode cortar)</SelectItem>
                      <SelectItem value="contain">Mostrar inteiro (sem corte)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                  <Label className="text-sm font-medium text-white">
                    Proporção do container
                  </Label>
                  <Select value={banner.aspectRatio || 'auto'} onValueChange={value => updateBanner({
                    aspectRatio: value
                  })}>
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automático (da imagem)</SelectItem>
                      <SelectItem value="4/1">Widescreen 4:1</SelectItem>
                      <SelectItem value="3/1">Ultra-wide 3:1</SelectItem>
                      <SelectItem value="16/5">Cinema 16:5</SelectItem>
                      <SelectItem value="21/9">Ultrawide 21:9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col gap-4 p-4 bg-gold/10 rounded-lg border border-gold/30">
                  <div className="flex items-center gap-3">
                    <Switch id="exibir-banner" checked={banner.exibir} onCheckedChange={toggleExibir} />
                    <Label htmlFor="exibir-banner" className="text-sm font-medium text-white whitespace-nowrap">
                      Exibir banner principal na vitrine
                    </Label>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button variant="outline" onClick={handleRemoveBanner} className="min-h-[44px] w-full sm:w-auto border-red-500/30 hover:bg-red-500/10" disabled={isSavingBanner}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover Banner
                    </Button>
                    <Button onClick={() => bannerInputRef.current?.click()} className="min-h-[44px] w-full sm:w-auto bg-gold hover:bg-gold-light text-black" disabled={isSavingBanner}>
                      <Upload className="w-4 h-4 mr-2" />
                      Trocar Banner
                    </Button>
                  </div>
                  {banner.imagemUrl && (
                    <p className="text-xs text-white/50 text-center">
                      ⚠️ As alterações são salvas automaticamente no banco de dados
                    </p>
                  )}
                </div>
              </div> : <div className="space-y-4">
                <div onClick={() => bannerInputRef.current?.click()} className="relative w-full h-64 rounded-lg border-2 border-dashed border-white/20 hover:border-gold/50 transition-colors cursor-pointer bg-black/20 flex flex-col items-center justify-center gap-3">
                  <Upload className="w-12 h-12 text-gold" />
                  <div className="text-center">
                    <p className="text-white font-medium">Clique ou arraste para upload</p>
                    <p className="text-white/60 text-sm mt-2">Recomendado: 1920 x 720 px</p>
                    <p className="text-white/60 text-sm">Proporção: 2.66:1</p>
                    <p className="text-white/60 text-sm">JPG, PNG, WEBP – até 3 MB</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="exibir-banner" className="text-sm font-medium text-white">
                    Exibir banner principal na vitrine
                  </Label>
                  <Switch id="exibir-banner" checked={banner.exibir} onCheckedChange={toggleExibir} />
                </div>
              </div>}
            <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleBannerUpload} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Configuração dos Cards */}
          <TabsContent value="cards" className="mt-6">
            <Card className="bg-surface/50 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-gold flex items-center gap-2">
                  Configuração dos Cards (Netflix Style)
                </CardTitle>
                <CardDescription className="text-white/60">
                  Personalize a aparência dos cards de cursos nas prateleiras
                </CardDescription>
              </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                <Label htmlFor="exibir-titulo" className="text-sm font-medium text-white">
                  Exibir título no card
                </Label>
                <Switch id="exibir-titulo" checked={settings.exibirTitulo} onCheckedChange={checked => updateSettings({
                    exibirTitulo: checked
                  })} />
              </div>

              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                <Label htmlFor="exibir-descricao" className="text-sm font-medium text-white">
                  Exibir descrição curta
                </Label>
                <Switch id="exibir-descricao" checked={settings.exibirDescricao} onCheckedChange={checked => updateSettings({
                    exibirDescricao: checked
                  })} />
              </div>

              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                <Label htmlFor="exibir-categoria" className="text-sm font-medium text-white">
                  Exibir categoria
                </Label>
                <Switch id="exibir-categoria" checked={settings.exibirCategoria} onCheckedChange={checked => updateSettings({
                    exibirCategoria: checked
                  })} />
              </div>

              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                <Label htmlFor="mostrar-progresso" className="text-sm font-medium text-white">
                  Mostrar barra de progresso
                </Label>
                <Switch id="mostrar-progresso" checked={settings.mostrarProgresso} onCheckedChange={checked => updateSettings({
                    mostrarProgresso: checked
                  })} />
              </div>

              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                <Label htmlFor="mostrar-cadeado" className="text-sm font-medium text-white">
                  Mostrar cadeado em cursos bloqueados
                </Label>
                <Switch id="mostrar-cadeado" checked={settings.mostrarCadeado} onCheckedChange={checked => updateSettings({
                    mostrarCadeado: checked
                  })} />
              </div>

              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                <Label htmlFor="efeito-hover" className="text-sm font-medium text-white">
                  Aplicar efeito hover dourado
                </Label>
                <Switch id="efeito-hover" checked={settings.efeitoHover} onCheckedChange={checked => updateSettings({
                    efeitoHover: checked
                  })} />
              </div>

              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/10">
                <Label htmlFor="mostrar-borda" className="text-sm font-medium text-white">
                  Mostrar borda nos cards
                </Label>
                <Switch id="mostrar-borda" checked={settings.mostrarBorda ?? true} onCheckedChange={checked => updateSettings({
                    mostrarBorda: checked
                  })} />
              </div>

              <div className="p-3 bg-black/20 rounded-lg border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-white">
                    Intensidade do gradiente nos cards
                  </Label>
                  <span className="text-sm text-gold font-medium">{settings.opacidadeGradienteCard ?? 60}%</span>
                </div>
                <Slider 
                  value={[settings.opacidadeGradienteCard ?? 60]} 
                  onValueChange={([val]) => updateSettings({ opacidadeGradienteCard: val })}
                  min={0} 
                  max={100} 
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-white/50">0% = sem escurecimento | 100% = escurecimento total</p>
              </div>

              <div className="p-3 bg-black/20 rounded-lg border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-white">
                    Intensidade do gradiente no banner principal
                  </Label>
                  <span className="text-sm text-gold font-medium">{settings.opacidadeGradienteVitrine ?? 80}%</span>
                </div>
                <Slider 
                  value={[settings.opacidadeGradienteVitrine ?? 80]} 
                  onValueChange={([val]) => updateSettings({ opacidadeGradienteVitrine: val })}
                  min={0} 
                  max={100} 
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-white/50">Controla a opacidade do gradiente sobre o banner hero</p>
              </div>

              <div className="p-3 bg-black/20 rounded-lg border border-white/10">
                <Label htmlFor="limite-global" className="text-sm font-medium text-white">
                  Limite global de cards por prateleira
                </Label>
                <Input id="limite-global" type="number" min="1" max="50" value={settings.limiteGlobal} onChange={e => updateSettings({
                    limiteGlobal: parseInt(e.target.value) || 20
                  })} className="mt-2 bg-black/30 border-white/10" />
              </div>
            </div>

            <Button onClick={handleSaveCardsSettings} className="w-full bg-gold hover:bg-gold-light text-black">
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Banners Secundários */}
          <TabsContent value="banners" className="mt-6">
            <Card className="bg-surface/50 backdrop-blur-sm border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-gold text-base flex items-center gap-2">Banners Promo  Campanhas Eventos</CardTitle>
                  <CardDescription className="text-white/60 mt-2">
                    Tamanho recomendado: 1200x400px • Aparecem entre as prateleiras
                  </CardDescription>
                </div>
            <Dialog open={bannerDialogOpen} onOpenChange={setBannerDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                    setEditingBanner(null);
                    setBannerFormData({
                      nome: '',
                      posicao: 'antes',
                      tipo: 'estatico',
                      ativo: true,
                      exibir_vitrine: true,
                      exibir_comunidade: false,
                      agendamento_habilitado: false,
                      agendamento_data_inicio: undefined,
                      agendamento_hora_inicio: '00:00',
                      agendamento_data_fim: undefined,
                      agendamento_hora_fim: '23:59'
                    });
                  }} className="bg-gold hover:bg-gold-light text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface border-white/10 max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-gold">
                    {editingBanner ? 'Editar Banner' : 'Novo Banner Secundário'}
                  </DialogTitle>
                  <DialogDescription className="text-white/60">
                    Recomendado: 1200 x 400 px
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Coluna Esquerda - Preview e Upload */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white mb-2 block">Nome da Promoção (opcional)</Label>
                      <Input placeholder="Ex: Black Friday 2024" value={bannerFormData.nome || ''} onChange={e => setBannerFormData({
                          ...bannerFormData,
                          nome: e.target.value
                        })} className="bg-black/30 border-white/10" />
                    </div>

                    <div>
                      <Label className="text-white mb-2 block">Preview do Banner</Label>
                      {bannerFormData.imagem_url ? <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gold/20">
                          <img src={bannerFormData.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                          <Button size="sm" variant="outline" onClick={() => setBannerFormData({
                            ...bannerFormData,
                            imagem_url: undefined
                          })} className="absolute top-2 right-2 bg-black/80 border-red-500/30 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div> : <div onClick={() => bannerSecInputRef.current?.click()} className="w-full h-48 rounded-lg border-2 border-dashed border-white/20 hover:border-gold/50 transition-colors cursor-pointer bg-black/20 flex items-center justify-center">
                          <div className="text-center">
                            <Upload className="w-8 h-8 text-gold mx-auto mb-2" />
                            <p className="text-white/60 text-sm">Clique para upload</p>
                          </div>
                        </div>}
                      <input ref={bannerSecInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleBannerSecUpload} />
                    </div>
                  </div>

                  {/* Coluna Direita - Configurações */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white mb-2 block">Posição</Label>
                        <Select value={bannerFormData.posicao} onValueChange={(value: any) => setBannerFormData({
                            ...bannerFormData,
                            posicao: value
                          })}>
                          <SelectTrigger className="bg-black/30 border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-surface border-white/10 z-[100]">
                            <SelectItem value="antes">Antes das prateleiras</SelectItem>
                            <SelectItem value="entre">Entre prateleiras</SelectItem>
                            <SelectItem value="depois">Após prateleiras</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-white mb-2 block">Tipo</Label>
                        <Select value={bannerFormData.tipo} onValueChange={(value: any) => setBannerFormData({
                            ...bannerFormData,
                            tipo: value
                          })}>
                          <SelectTrigger className="bg-black/30 border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-surface border-white/10 z-[100]">
                            <SelectItem value="estatico">Estático</SelectItem>
                            <SelectItem value="carrossel">Carrossel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Onde Exibir */}
                    <div className="space-y-3 p-4 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg">
                      <Label className="text-white text-base">Onde Exibir</Label>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <Switch 
                            checked={bannerFormData.exibir_vitrine ?? true} 
                            onCheckedChange={checked => setBannerFormData({
                              ...bannerFormData,
                              exibir_vitrine: checked
                            })} 
                          />
                          <Label className="text-white text-sm cursor-pointer">Vitrine (Showcase)</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch 
                            checked={bannerFormData.exibir_comunidade ?? false} 
                            onCheckedChange={checked => setBannerFormData({
                              ...bannerFormData,
                              exibir_comunidade: checked
                            })} 
                          />
                          <Label className="text-white text-sm cursor-pointer">Comunidade</Label>
                        </div>
                      </div>
                    </div>

                    {/* Agendamento */}
                    <div className="space-y-4 p-4 bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-white text-base">Agendamento Automático</Label>
                          <p className="text-sm text-white/50 mt-1">Ativar/desativar banner em datas específicas</p>
                        </div>
                        <Switch checked={bannerFormData.agendamento_habilitado ?? false} onCheckedChange={checked => setBannerFormData({
                            ...bannerFormData,
                            agendamento_habilitado: checked
                          })} />
                      </div>

                      {bannerFormData.agendamento_habilitado && <div className="space-y-4 pt-4 border-t border-white/10">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-white">Data de Início</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-black/30 border-white/10 hover:bg-black/40", !bannerFormData.agendamento_data_inicio && "text-white/50")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {bannerFormData.agendamento_data_inicio ? format(new Date(bannerFormData.agendamento_data_inicio), "dd/MM/yyyy") : <span>Selecione</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-surface border-white/10" align="start">
                                  <Calendar mode="single" selected={bannerFormData.agendamento_data_inicio ? new Date(bannerFormData.agendamento_data_inicio) : undefined} onSelect={date => setBannerFormData({
                                    ...bannerFormData,
                                    agendamento_data_inicio: date ? format(date, 'yyyy-MM-dd') : undefined
                                  })} initialFocus className="pointer-events-auto" />
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-white">Hora de Início</Label>
                              <Input type="time" value={bannerFormData.agendamento_hora_inicio || '00:00'} onChange={e => setBannerFormData({
                                ...bannerFormData,
                                agendamento_hora_inicio: e.target.value
                              })} className="bg-black/30 border-white/10" />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-white">Data de Término</Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-black/30 border-white/10 hover:bg-black/40", !bannerFormData.agendamento_data_fim && "text-white/50")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {bannerFormData.agendamento_data_fim ? format(new Date(bannerFormData.agendamento_data_fim), "dd/MM/yyyy") : <span>Selecione</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-surface border-white/10" align="start">
                                  <Calendar mode="single" selected={bannerFormData.agendamento_data_fim ? new Date(bannerFormData.agendamento_data_fim) : undefined} onSelect={date => setBannerFormData({
                                    ...bannerFormData,
                                    agendamento_data_fim: date ? format(date, 'yyyy-MM-dd') : undefined
                                  })} initialFocus className="pointer-events-auto" />
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-white">Hora de Término</Label>
                              <Input type="time" value={bannerFormData.agendamento_hora_fim || '23:59'} onChange={e => setBannerFormData({
                                ...bannerFormData,
                                agendamento_hora_fim: e.target.value
                              })} className="bg-black/30 border-white/10" />
                            </div>
                          </div>

                          {bannerFormData.agendamento_data_inicio && bannerFormData.agendamento_data_fim && <div className="p-3 bg-gold/10 border border-gold/20 rounded-lg">
                              <p className="text-sm text-gold">
                                Banner ativo: {format(new Date(bannerFormData.agendamento_data_inicio), "dd/MM")} {bannerFormData.agendamento_hora_inicio} até {format(new Date(bannerFormData.agendamento_data_fim), "dd/MM")} {bannerFormData.agendamento_hora_fim}
                              </p>
                            </div>}
                        </div>}
                    </div>

                    <div className="flex items-center gap-3">
                      <Label htmlFor="banner-ativo" className="text-white">
                        Ativar banner
                      </Label>
                      <Switch id="banner-ativo" checked={bannerFormData.ativo} onCheckedChange={checked => setBannerFormData({
                          ...bannerFormData,
                          ativo: checked
                        })} />
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setBannerDialogOpen(false)} className="min-h-[44px] w-full sm:w-auto">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveBanner} className="min-h-[44px] w-full sm:w-auto bg-gold hover:bg-gold-light text-black">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {banners.length > 0 ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndBanners}>
                <SortableContext items={banners.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {banners.map(banner => <SortableBannerItem key={banner.id} banner={banner} onEdit={() => handleEditBanner(banner)} onDelete={() => handleDeleteBanner(banner.id)} onToggle={() => handleToggleBanner(banner.id, !banner.ativo)} getStatus={getBannerStatus} />)}
                  </div>
                </SortableContext>
              </DndContext> : <div className="text-center py-12 bg-black/20 rounded-lg border border-white/10">
                <ImageIcon className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/60">Nenhum banner secundário cadastrado</p>
                <p className="text-white/40 text-sm mt-1">Adicione banners promocionais para a vitrine</p>
              </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: Prateleiras */}
          <TabsContent value="shelves" className="mt-6">
            <Card className="bg-surface/50 backdrop-blur-sm border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-gold flex items-center gap-2 text-lg sm:text-xl">
                    Prateleiras <span className="hidden sm:inline">(Shelves)</span> da Vitrine
                  </CardTitle>
                  <CardDescription className="text-white/60 mt-2">
                    Organize os cursos em fileiras horizontais estilo Netflix
                  </CardDescription>
                </div>
            <Dialog open={shelfDialogOpen} onOpenChange={setShelfDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                    setEditingShelf(null);
                    setShelfFormData({
                      titulo: '',
                      tipo: 'automatica',
                      ativo: true,
                      cursosIds: []
                    });
                  }} className="bg-gold hover:bg-gold-light text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface border-white/10 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-gold">
                    {editingShelf ? 'Editar Prateleira' : 'Nova Prateleira'}
                  </DialogTitle>
                  <DialogDescription className="text-white/60">
                    Configure uma prateleira de cursos para a vitrine
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="shelf-title" className="text-white mb-2 block">
                      Nome da Prateleira
                    </Label>
                    <Input id="shelf-title" value={shelfFormData.titulo} onChange={e => setShelfFormData({
                        ...shelfFormData,
                        titulo: e.target.value
                      })} placeholder="Ex: Meus Cursos" className="bg-black/30 border-white/10" />
                  </div>

                  <div>
                    <Label className="text-white mb-2 block">Tipo</Label>
                    <Select value={shelfFormData.tipo} onValueChange={(value: any) => setShelfFormData({
                        ...shelfFormData,
                        tipo: value,
                        categoriaId: value !== 'categoria' ? undefined : shelfFormData.categoriaId
                      })}>
                      <SelectTrigger className="bg-black/30 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-white/10">
                        <SelectItem value="automatica">Automática (todos os cursos)</SelectItem>
                        <SelectItem value="manual">Manual (selecionar cursos)</SelectItem>
                        <SelectItem value="categoria">Por Categoria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {shelfFormData.tipo === 'categoria' && <div>
                      <Label className="text-white mb-2 block">Selecionar Categoria</Label>
                      {categories.length > 0 ? (
                        <Select value={shelfFormData.categoriaId || ''} onValueChange={(value) => setShelfFormData({
                            ...shelfFormData,
                            categoriaId: value
                          })}>
                          <SelectTrigger className="bg-black/30 border-white/10">
                            <SelectValue placeholder="Escolha uma categoria" />
                          </SelectTrigger>
                          <SelectContent className="bg-surface border-white/10">
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor || '#D4AF37' }} />
                                  {cat.nome}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                          Nenhuma categoria cadastrada. Crie categorias em "Categorias e Tags" antes de usar este tipo de prateleira.
                        </div>
                      )}
                    </div>}

                  {shelfFormData.tipo === 'manual' && <div>
                      <Label className="text-white mb-2 block">Selecionar Cursos</Label>
                      <ScrollArea className="h-64 rounded-lg border border-white/10 bg-black/30 p-4">
                        <div className="space-y-2">
                          {cursos.map(curso => <div key={curso.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5">
                              <Checkbox id={`curso-${curso.id}`} checked={shelfFormData.cursosIds?.includes(curso.id)} onCheckedChange={() => handleToggleCourse(curso.id)} />
                              <Label htmlFor={`curso-${curso.id}`} className="text-white flex-1 cursor-pointer">
                                {curso.titulo}
                              </Label>
                            </div>)}
                        </div>
                      </ScrollArea>
                      <p className="text-xs text-white/50 mt-2">
                        {shelfFormData.cursosIds?.length || 0} curso(s) selecionado(s)
                      </p>
                    </div>}

                  <div className="flex items-center gap-3">
                    <Label htmlFor="shelf-ativo" className="text-white">
                      Exibir na vitrine
                    </Label>
                    <Switch id="shelf-ativo" checked={shelfFormData.ativo} onCheckedChange={checked => setShelfFormData({
                        ...shelfFormData,
                        ativo: checked
                      })} />
                  </div>
                </div>

                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setShelfDialogOpen(false)} className="min-h-[44px] w-full sm:w-auto">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveShelf} className="min-h-[44px] w-full sm:w-auto bg-gold hover:bg-gold-light text-black">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {shelves.length > 0 ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndShelves}>
                <SortableContext items={shelves.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {shelves.map(shelf => <SortableShelfItem key={shelf.id} shelf={shelf} onEdit={() => handleEditShelf(shelf)} onDelete={() => handleDeleteShelf(shelf.id)} onToggle={() => handleToggleShelf(shelf.id, !shelf.ativo)} getCategoryName={getCategoryName} />)}
                  </div>
                </SortableContext>
              </DndContext> : <div className="text-center py-12 bg-black/20 rounded-lg border border-white/10">
                <ImageIcon className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/60">Nenhuma prateleira cadastrada</p>
                <p className="text-white/40 text-sm mt-1">Adicione prateleiras para organizar os cursos</p>
              </div>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Coluna Direita: Preview */}
        {showPreview && <ShowcasePreview device={previewDevice} onDeviceChange={setPreviewDevice} isExpanded={isPreviewExpanded} onToggleExpand={() => setIsPreviewExpanded(!isPreviewExpanded)} onOpenNewTab={handleOpenNewTab} />}
      </div>
    </div>;
}