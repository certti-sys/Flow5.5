import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VideoSpeedControlProps {
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2];

export function VideoSpeedControl({
  playbackRate,
  onPlaybackRateChange,
}: VideoSpeedControlProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-white hover:text-primary hover:bg-white/10 font-medium"
        >
          {playbackRate}x
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-black/95 border-white/20 backdrop-blur-md min-w-[140px]"
      >
        {PLAYBACK_RATES.map((rate) => (
          <DropdownMenuItem
            key={rate}
            onClick={() => onPlaybackRateChange(rate)}
            className={`cursor-pointer hover:bg-white/10 ${
              rate === playbackRate
                ? "text-primary font-semibold"
                : "text-white/90"
            }`}
          >
            {rate === 1 ? "Normal" : `${rate}x`}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
