import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Link2,
  FileText,
  Download,
  Code,
  ExternalLink,
  ChevronDown,
  FolderOpen
} from "lucide-react";

interface Material {
  id: string;
  type: "link" | "text" | "download" | "embed";
  title: string;
  content: string;
  description?: string | null;
  is_required: boolean;
  order_index: number;
}

interface LessonMaterialsProps {
  materials: Material[];
}

const materialIcons = {
  link: Link2,
  text: FileText,
  download: Download,
  embed: Code,
};

const materialLabels = {
  link: "Link",
  text: "Texto",
  download: "Download",
  embed: "Embed",
};

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
          <Card key={material.id} className="glass-card border-white/10">
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
          <Card key={material.id} className="glass-card border-white/10">
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
          <Card key={material.id} className="glass-card border-white/10">
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
          <Card key={material.id} className="glass-card border-white/10">
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
              <div className="aspect-video rounded-lg overflow-hidden bg-black/20">
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

      default:
        return null;
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
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
