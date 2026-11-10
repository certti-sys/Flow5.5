import { Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface VideoVolumeControlProps {
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
}

export function VideoVolumeControl({
  volume,
  muted,
  onVolumeChange,
  onMuteToggle,
}: VideoVolumeControlProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMuteToggle}
        className="h-8 w-8 text-white hover:text-primary hover:bg-white/10"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
      
      <Popover>
        <PopoverTrigger asChild>
          <div className="hidden md:block w-20 cursor-pointer">
            <Slider
              value={[muted ? 0 : volume * 100]}
              onValueChange={(values) => onVolumeChange(values[0] / 100)}
              max={100}
              step={1}
              className="[&_.relative]:h-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_.bg-primary]:bg-primary"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-12 p-2 bg-black/90 border-white/20" side="top">
          <div className="h-24 flex items-center justify-center">
            <Slider
              value={[muted ? 0 : volume * 100]}
              onValueChange={(values) => onVolumeChange(values[0] / 100)}
              max={100}
              step={1}
              orientation="vertical"
              className="h-full [&_.relative]:w-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_.bg-primary]:bg-primary"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
