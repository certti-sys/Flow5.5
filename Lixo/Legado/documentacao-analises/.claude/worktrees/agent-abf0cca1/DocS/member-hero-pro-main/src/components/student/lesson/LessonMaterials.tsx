import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonMaterialsProps {
  materials?: string[] | null;
}

export function LessonMaterials({ materials }: LessonMaterialsProps) {
  if (!materials || materials.length === 0) {
    return null;
  }

  const getFileIcon = (url: string) => {
    const extension = url.split(".").pop()?.toLowerCase();
    return <FileText className="h-5 w-5" />;
  };

  const getFileName = (url: string) => {
    const parts = url.split("/");
    const filename = parts[parts.length - 1];
    return decodeURIComponent(filename);
  };

  return (
    <div className="space-y-3 sm:space-y-4 py-4 sm:py-6">
      <h3 className="text-lg sm:text-xl font-semibold text-foreground">Materiais Complementares</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map((material, index) => (
          <div
            key={index}
            className="glass-card p-4 rounded-lg border border-border/40 hover:border-primary/60 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                {getFileIcon(material)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {getFileName(material)}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="w-full mt-3 text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => window.open(material, "_blank")}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
