import { Play, Pause, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoTimestamp } from "./VideoTimestamp";
import { VideoVolumeControl } from "./VideoVolumeControl";
import { VideoSpeedControl } from "./VideoSpeedControl";
import { VideoProgressBar } from "./VideoProgressBar";
import { VideoMarker } from "@/types/video";

interface VideoControlsProps {
  playing: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  buffered: number;
  isFullscreen: boolean;
  markers?: VideoMarker[];
  onPlayPause: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onSeek: (time: number) => void;
  onFullscreenToggle: () => void;
}

export function VideoControls({
  playing,
  volume,
  muted,
  playbackRate,
  currentTime,
  duration,
  buffered,
  isFullscreen,
  markers,
  onPlayPause,
  onVolumeChange,
  onMuteToggle,
  onPlaybackRateChange,
  onSeek,
  onFullscreenToggle,
}: VideoControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/95 via-black/85 to-transparent backdrop-blur-sm p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      {/* Progress Bar */}
      <div className="mb-3">
        <VideoProgressBar
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          markers={markers}
          onSeek={onSeek}
        />
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between gap-4">
        {/* Left Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPlayPause}
            className="h-9 w-9 text-white hover:text-primary hover:bg-white/10"
          >
            {playing ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5" fill="currentColor" />
            )}
          </Button>

          <VideoVolumeControl
            volume={volume}
            muted={muted}
            onVolumeChange={onVolumeChange}
            onMuteToggle={onMuteToggle}
          />

          <VideoTimestamp currentTime={currentTime} duration={duration} />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <VideoSpeedControl
            playbackRate={playbackRate}
            onPlaybackRateChange={onPlaybackRateChange}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={onFullscreenToggle}
            className="h-8 w-8 text-white hover:text-primary hover:bg-white/10"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
