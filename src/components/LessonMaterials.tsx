import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PdfViewer } from "@/components/PdfViewer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Link2,
  FileText,
  Download,
  Code,
  ExternalLink,
  ChevronDown,
  FolderOpen,
  BookOpen,
  Loader2
} from "lucide-react";

interface Material {
  id: string;
  type: "link" | "text" | "download" | "embed" | "pdf";
  title: string;
  content: string;
  description?: string | null;
  is_required: boolean;
  order_index: number;
  file_meta?: { size?: number; name?: string } | null;
}

interface LessonMaterialsProps {
  materials: Material[];
}

const materialIcons = {
  link: Link2,
  text: FileText,
  download: Download,
  embed: Code,
  pdf: BookOpen,
};

const materialLabels = {
  link: "Link",
  text: "Texto",
  download: "Download",
  embed: "Embed",
  pdf: "PDF",
};

const formatSize = (bytes?: number) => {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * PDF da aula. A URL assinada só é pedida quando o aluno abre o material:
 * gerar para todos de uma vez gastaria assinaturas e estouraria o rate limit
 * da edge em aulas com vários arquivos.
 */
function PdfMaterialCard({ material }: { material: Material }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const Icon = materialIcons.pdf;
  const size = formatSize(material.file_meta?.size);

  const open = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("lesson-file-url", {
        body: { materialId: material.id },
      });
      if (error) {
        const res = (error as { context?: Response }).context;
        const body = res && typeof res.json === "function" ? await res.json().catch(() => null) : null;
        throw new Error(body?.error || error.message);
      }
      if (data?.error) throw new Error(data.error);
      setUrl(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir o PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold">{material.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">{materialLabels.pdf}</Badge>
              {size && <span className="text-xs text-muted-foreground">{size}</span>}
              {material.is_required && (
                <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
              )}
            </div>
          </div>
          {!url && (
            <Button size="sm" onClick={open} disabled={loading} className="shrink-0 gap-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              Abrir
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {material.description && (
          <p className="text-xs text-muted-foreground">{material.description}</p>
        )}
        {url && (
          <PdfViewer url={url} title={material.title} fileName={material.file_meta?.name} />
        )}
      </CardContent>
    </Card>
  );
}

export function LessonMaterials({ materials }: LessonMaterialsProps) {
  const [expandedTexts, setExpandedTexts] = useState<Set<string>>(new Set());

  if (!materials || materials.length === 0) return null;

  const toggleTextExpanded = (id: string) => {
    setExpandedTexts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderMaterial = (material: Material) => {
    const Icon = materialIcons[material.type];

    switch (material.type) {
      case "link":
        return (
          <Card key={material.id} className="glass-card border-white/10 rounded-[16px]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{material.title}</h4>
                    {material.is_required && (
                      <Badge variant="outline" className="text-xs">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  {material.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {material.description}
                    </p>
                  )}
                  <a
                    href={material.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Abrir Link
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "text":
        const isExpanded = expandedTexts.has(material.id);
        return (
          <Card key={material.id} className="glass-card border-white/10 rounded-[16px]">
            <Collapsible open={isExpanded} onOpenChange={() => toggleTextExpanded(material.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-white/5 transition-colors p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-semibold">
                            {material.title}
                          </CardTitle>
                          {material.is_required && (
                            <Badge variant="outline" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        {material.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {material.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""
                        }`}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="pl-12 prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-foreground/90">{material.content}</p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );

      case "download":
        return (
          <Card key={material.id} className="glass-card border-white/10 rounded-[16px]">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{material.title}</h4>
                    {material.is_required && (
                      <Badge variant="outline" className="text-xs">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  {material.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {material.description}
                    </p>
                  )}
                  <a
                    href={material.content}
                    download
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Download className="w-3 h-3" />
                    Baixar Arquivo
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "embed":
        return (
          <Card key={material.id} className="glass-card border-white/10 rounded-[16px]">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">
                      {material.title}
                    </CardTitle>
                    {material.is_required && (
                      <Badge variant="outline" className="text-xs">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  {material.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {material.description}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="aspect-video rounded-[12px] overflow-hidden bg-black/20">
                <iframe
                  src={material.content}
                  className="w-full h-full border-0"
                  allowFullScreen
                  title={material.title}
                />
              </div>
            </CardContent>
          </Card>
        );

      case "pdf":
        return <PdfMaterialCard key={material.id} material={material} />;

      default:
        return null;
    }
  };

  return (
    <div className="glass-card rounded-[24px] border-white/10 p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Materiais da Aula</h2>
        <Badge variant="secondary" className="ml-auto">
          {materials.length} {materials.length === 1 ? "material" : "materiais"}
        </Badge>
      </div>
      <div className="space-y-3">
        {materials
          .sort((a, b) => a.order_index - b.order_index)
          .map(renderMaterial)}
      </div>
    </div>
  );
}
