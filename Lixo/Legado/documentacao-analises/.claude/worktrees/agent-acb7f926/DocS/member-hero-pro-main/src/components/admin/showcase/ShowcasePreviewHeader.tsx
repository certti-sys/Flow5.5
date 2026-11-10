import { Monitor, Tablet, Smartphone, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ShowcasePreviewHeaderProps {
  device: 'desktop' | 'tablet' | 'mobile';
  onDeviceChange: (device: 'desktop' | 'tablet' | 'mobile') => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenNewTab: () => void;
}

export function ShowcasePreviewHeader({
  device,
  onDeviceChange,
  isExpanded,
  onToggleExpand,
  onOpenNewTab,
}: ShowcasePreviewHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 bg-black/40">
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
        <h3 className="text-xs sm:text-sm font-semibold text-gold">Pré-visualização</h3>
        <Badge variant="secondary" className="text-[10px] sm:text-xs bg-gold/10 text-gold border-gold/20 w-fit">
          Ao vivo
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Device selector */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              device === 'desktop' && "bg-gold/20 text-gold"
            )}
            onClick={() => onDeviceChange('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              device === 'tablet' && "bg-gold/20 text-gold"
            )}
            onClick={() => onDeviceChange('tablet')}
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              device === 'mobile' && "bg-gold/20 text-gold"
            )}
            onClick={() => onDeviceChange('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleExpand}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onOpenNewTab}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
