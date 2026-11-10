import { useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { VideoMarker } from "@/types/video";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, BookOpen, Lightbulb, FileText } from "lucide-react";

interface VideoProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  markers?: VideoMarker[];
  onSeek: (time: number) => void;
}

const MARKER_ICONS = {
  importante: AlertCircle,
  exercicio: BookOpen,
  dica: Lightbulb,
  resumo: FileText,
};

const MARKER_COLORS = {
  importante: "text-red-400",
  exercicio: "text-blue-400",
  dica: "text-yellow-400",
  resumo: "text-green-400",
};

export function VideoProgressBar({
  currentTime,
  duration,
  buffered,
  markers = [],
  onSeek,
}: VideoProgressBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSeek = (values: number[]) => {
    const time = (values[0] / 100) * duration;
    onSeek(time);
  };

  const getMarkerPosition = (time: number) => {
    return (time / duration) * 100;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full group" ref={containerRef}>
      {/* Buffered indicator */}
      <div className="absolute inset-0 h-1 top-1/2 -translate-y-1/2 pointer-events-none">
        <div
          className="h-full bg-white/20 rounded-full transition-all"
          style={{ width: `${(buffered / duration) * 100}%` }}
        />
      </div>

      {/* Progress slider */}
      <Slider
        value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
        onValueChange={handleSeek}
        max={100}
        step={0.1}
        className="relative [&_.relative]:h-1 group-hover:[&_.relative]:h-1.5 transition-all [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 group-hover:[&_[role=slider]]:h-4 group-hover:[&_[role=slider]]:w-4 [&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-primary [&_.bg-primary]:to-primary/80 [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-[0_0_10px_rgba(212,175,55,0.5)]"
      />

      {/* Markers */}
      <TooltipProvider>
        {markers.map((marker) => {
          const Icon = MARKER_ICONS[marker.tipo];
          const colorClass = MARKER_COLORS[marker.tipo];
          
          return (
            <Tooltip key={marker.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSeek(marker.tempo)}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 hover:scale-125 transition-transform"
                  style={{ left: `${getMarkerPosition(marker.tempo)}%` }}
                >
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(212,175,55,0.8)] border border-primary/50" />
                    {Icon && (
                      <Icon className={`w-3 h-3 ${colorClass} absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity`} />
                    )}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-black/95 border-primary/30 backdrop-blur-md"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-primary text-sm">{marker.titulo}</p>
                  {marker.descricao && (
                    <p className="text-xs text-white/70">{marker.descricao}</p>
                  )}
                  <p className="text-xs text-white/50">{formatTime(marker.tempo)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
