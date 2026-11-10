// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { formatVideoTime } from "@/lib/videoUtils";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface YouTubePlayerProps {
  videoId: string;
  courseId: string;
  lessonId: string;
  onProgressUpdate?: (progress: number) => void;
}

export default function YouTubePlayer({
  videoId,
  courseId,
  lessonId,
  onProgressUpdate,
}: YouTubePlayerProps) {
  const { user } = useAuth();
  const { progress: savedProgress, completed, updateProgress, markCompleted } = useLessonProgress(
    user?.id || null,
    lessonId,
    courseId
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const saveProgressIntervalRef = useRef<NodeJS.Timeout>();
  const iframeId = useRef<string>(`yt-${courseId}-${lessonId}-${Math.random().toString(36).slice(2)}`);

  const [isPlaying, setIsPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  const getIframeSrc = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    const params = new URLSearchParams({
      autoplay: isMobile ? "0" : "1",
      mute: "1",
      controls: isMobile ? "1" : "0",
      showinfo: "0",
      modestbranding: "1",
      rel: "0",
      iv_load_policy: "3",
      disablekb: isMobile ? "0" : "1",
      fs: "1",
      cc_load_policy: "0",
      playsinline: "1",
      enablejsapi: "1",
      origin: window.location.origin,
      widget_referrer: window.location.origin,
      autohide: "1",
      loop: "0",
      playlist: videoId,
    });
    
    return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
  };

  const sendCommand = (command: string, args: any = []) => {
    if (!iframeRef.current) return;
    
    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: command,
        args: args,
      }),
      "*"
    );
  };

  useEffect(() => {
    if (!hasStarted) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsReady(true);

      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "listening", id: iframeId.current }),
          "*"
        );
        sendCommand("addEventListener", ["onStateChange"]);
      } catch {}
      
      setTimeout(() => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (!isMobile) {
          sendCommand("unMute");
          sendCommand("setVolume", volume);
          setIsMuted(false);
        }
        startProgressTracking();
      }, 500);
    };

    iframe.addEventListener("load", handleLoad);
    return () => {
      iframe.removeEventListener("load", handleLoad);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [hasStarted]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      
      try {
        const data = JSON.parse(event.data);
        
        if (data.event === "infoDelivery" && data.info?.duration) {
          const newDuration = data.info.duration;
          setDuration(newDuration);
          
          if (savedProgress > 0 && newDuration > 0) {
            const seekTime = (savedProgress / 100) * newDuration;
            setTimeout(() => sendCommand("seekTo", [seekTime, true]), 500);
          }
        }
        
        if (data.event === "infoDelivery" && data.info?.currentTime !== undefined) {
          const progress = data.info.currentTime / duration;
          if (!isNaN(progress)) setPlayed(progress);
        }
        
        if (data.event === "onStateChange" && data.info === 0) {
          if (!completed) {
            setIsPlaying(false);
            handleMarkCompleted();
          }
        }
        
        if (data.event === "onStateChange" && data.info === 1) setIsPlaying(true);
        if (data.event === "onStateChange" && data.info === 2) setIsPlaying(false);
      } catch {}
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [duration, savedProgress, completed]);

  const startProgressTracking = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      sendCommand("getCurrentTime");
      sendCommand("getDuration");
    }, 1000);
  };

  useEffect(() => {
    if (!isPlaying || !user) return;

    if (saveProgressIntervalRef.current) clearInterval(saveProgressIntervalRef.current);

    saveProgressIntervalRef.current = setInterval(() => {
      if (duration > 0 && played > 0) {
        const progressPercent = played * 100;
        updateProgress(progressPercent);
        onProgressUpdate?.(progressPercent);
      }
    }, 10000);

    return () => {
      if (saveProgressIntervalRef.current) clearInterval(saveProgressIntervalRef.current);
    };
  }, [isPlaying, played, duration, user, updateProgress, onProgressUpdate]);

  useEffect(() => {
    if (showControls && isPlaying) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [showControls, isPlaying]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      sendCommand("pauseVideo");
      setIsPlaying(false);
    } else {
      sendCommand("playVideo");
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number[]) => {
    const newPlayed = value[0] / 100;
    const seekTime = newPlayed * duration;
    sendCommand("seekTo", [seekTime, true]);
    setPlayed(newPlayed);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    sendCommand("setVolume", newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      sendCommand("unMute");
      sendCommand("setVolume", volume);
      setIsMuted(false);
    } else {
      sendCommand("mute");
      setIsMuted(true);
    }
  };

  const skip = (seconds: number) => {
    const currentTime = played * duration;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    sendCommand("seekTo", [newTime, true]);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const handleMarkCompleted = async () => {
    if (!user) return;
    await markCompleted();
    toast.success('Parabéns! Aula concluída!');
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    sendCommand("setPlaybackRate", [rate]);
  };

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const qualityOptions = ["Auto"];

  const handleFirstPlay = () => {
    setShowPoster(false);
    setHasStarted(true);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      setTimeout(() => sendCommand("playVideo"), 300);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden group"
      style={{ aspectRatio: "16/9", userSelect: "none" }}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {showPoster && (
        <div className="absolute inset-0 z-40 cursor-pointer" onClick={handleFirstPlay}>
          <img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center hover:bg-black/40 transition-colors">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl">
              <Play className="h-10 w-10 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>
        </div>
      )}

      {hasStarted && (
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            ref={iframeRef}
            id={iframeId.current}
            src={getIframeSrc()}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            title="YouTube video player"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
          />
          <div 
            className="absolute inset-0 z-10 hidden md:block"
            style={{ pointerEvents: "auto", background: "transparent" }}
            onClick={togglePlay}
            onDoubleClick={toggleFullscreen}
          />
        </div>
      )}

      {!isReady && hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 z-30 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
        style={{ pointerEvents: showControls || !isPlaying ? "auto" : "none" }}
      >
        <div className="mb-3">
          <Slider value={[played * 100]} max={100} step={0.1} onValueChange={handleSeek} className="cursor-pointer" />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={togglePlay} className="h-9 w-9 text-white hover:bg-primary/20">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => skip(-10)} className="h-8 w-8 text-white hover:bg-primary/20">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => skip(10)} className="h-8 w-8 text-white hover:bg-primary/20">
              <SkipForward className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8 text-white hover:bg-primary/20">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider value={[isMuted ? 0 : volume]} max={100} step={1} onValueChange={handleVolumeChange} className="w-20 cursor-pointer" />
            </div>
            <span className="text-white text-sm font-medium">
              {formatVideoTime(played * duration)} / {formatVideoTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-primary/20">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur">
                <DropdownMenuLabel>Velocidade</DropdownMenuLabel>
                {speedOptions.map((speed) => (
                  <DropdownMenuItem
                    key={speed}
                    onClick={() => handlePlaybackRateChange(speed)}
                    className={playbackRate === speed ? "bg-primary/20" : ""}
                  >
                    {speed}x {playbackRate === speed && "✓"}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Qualidade</DropdownMenuLabel>
                {qualityOptions.map((quality) => (
                  <DropdownMenuItem key={quality} className="bg-primary/20">
                    {quality} ✓
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8 text-white hover:bg-primary/20">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}