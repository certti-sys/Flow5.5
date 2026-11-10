// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
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
import { extractVideoUrl, getVideoConfig, formatVideoTime, detectPlatform, extractYouTubeVideoId, extractGoogleDriveId, extractBunnyVideoId } from "@/lib/videoUtils";
import YouTubePlayer from "./YouTubePlayer";
import { useLessonProgress } from "@/hooks/useLessonProgress";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface UniversalVideoPlayerProps {
  videoUrl: string;
  courseId: string;
  lessonId: string;
  onProgressUpdate?: (progress: number) => void;
}

export default function UniversalVideoPlayer({
  videoUrl,
  courseId,
  lessonId,
  onProgressUpdate,
}: UniversalVideoPlayerProps) {
  const { user } = useAuth();
  const { progress: savedProgress, completed, updateProgress, markCompleted } = useLessonProgress(
    user?.id || null,
    lessonId,
    courseId
  );

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const [isPlaying, setIsPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [processedUrl, setProcessedUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [videoConfig, setVideoConfig] = useState<any>({});
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUrl) return;

    const cleanUrl = extractVideoUrl(videoUrl);
    const detectedPlatform = detectPlatform(cleanUrl);
    const config = getVideoConfig(cleanUrl);
    
    setPlatform(detectedPlatform);
    setVideoConfig(config);
    
    if (detectedPlatform === 'youtube') {
      const videoId = extractYouTubeVideoId(cleanUrl);
      setYoutubeVideoId(videoId);
      setProcessedUrl("");
    } else if (detectedPlatform === 'panda-video' || detectedPlatform === 'vturb') {
      // For Panda Video and VTurb, use the clean URL directly for iframe
      setYoutubeVideoId(null);
      setProcessedUrl(cleanUrl);
    } else {
      setYoutubeVideoId(null);
      setProcessedUrl(cleanUrl);
    }

    setIsReady(false);
    setIsPlaying(false);
    setError(null);
  }, [videoUrl]);

  useEffect(() => {
    if (!isReady || !playerRef.current || savedProgress === 0) return;
    
    const progressFraction = savedProgress / 100;
    setPlayed(progressFraction);
    playerRef.current.seekTo(progressFraction);
  }, [isReady, savedProgress]);

  useEffect(() => {
    if (!isPlaying || !user) return;

    const interval = setInterval(() => {
      if (playerRef.current && duration > 0) {
        const currentTime = playerRef.current.getCurrentTime();
        const progressPercent = (currentTime / duration) * 100;
        updateProgress(progressPercent);
        onProgressUpdate?.(progressPercent);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isPlaying, user, duration, updateProgress, onProgressUpdate]);

  useEffect(() => {
    if (showControls && isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Define handleMouseMove before early returns that use it
  const handleMouseMove = () => setShowControls(true);

  // Render YouTube player separately
  if (youtubeVideoId) {
    return (
      <YouTubePlayer
        videoId={youtubeVideoId}
        courseId={courseId}
        lessonId={lessonId}
        onProgressUpdate={onProgressUpdate}
      />
    );
  }

  // Render Panda Video with iframe
  if (platform === 'panda-video' && processedUrl) {
    return (
      <div 
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
        onMouseMove={handleMouseMove}
        onContextMenu={(e) => e.preventDefault()}
      >
        <iframe
          src={processedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsReady(true)}
        />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        )}
      </div>
    );
  }

  // Render VTurb with iframe
  if (platform === 'vturb' && processedUrl) {
    return (
      <div 
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
        onMouseMove={handleMouseMove}
        onContextMenu={(e) => e.preventDefault()}
      >
        <iframe
          src={processedUrl}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setIsReady(true)}
        />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        )}
      </div>
    );
  }

  // Render Bunny.net with iframe (embed URLs) or ReactPlayer (direct CDN files)
  if (platform === 'bunny' && processedUrl) {
    // Check if it's an embed URL or direct CDN file
    const isDirectFile = processedUrl.includes('.b-cdn.net') && processedUrl.match(/\.(mp4|webm|m3u8)(\?|$)/i);
    
    if (!isDirectFile) {
      // Use iframe for embed URLs
      let embedUrl = processedUrl;
      
      // If it's a CDN URL without file extension, try to build embed URL
      if (processedUrl.includes('.b-cdn.net') && !isDirectFile) {
        const bunnyData = extractBunnyVideoId(processedUrl);
        if (bunnyData?.library && bunnyData?.videoId) {
          embedUrl = `https://iframe.mediadelivery.net/embed/${bunnyData.library}/${bunnyData.videoId}`;
        }
      }
      
      return (
        <div 
          ref={containerRef}
          className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
          onMouseMove={handleMouseMove}
          onContextMenu={(e) => e.preventDefault()}
        >
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => setIsReady(true)}
          />
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          )}
        </div>
      );
    }
    // Direct CDN files fall through to ReactPlayer below
  }

  // Render Google Drive with iframe
  if (platform === 'google-drive' && processedUrl) {
    const driveId = extractGoogleDriveId(processedUrl);
    if (driveId) {
      const embedUrl = `https://drive.google.com/file/d/${driveId}/preview`;
      return (
        <div 
          ref={containerRef}
          className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
          onMouseMove={handleMouseMove}
          onContextMenu={(e) => e.preventDefault()}
        >
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
            onLoad={() => setIsReady(true)}
          />
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          )}
        </div>
      );
    }
  }

  if (!processedUrl) {
    return (
      <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleProgress = (state: any) => setPlayed(state.played);

  const handleSeek = (value: number[]) => {
    const newPlayed = value[0] / 100;
    setPlayed(newPlayed);
    playerRef.current?.seekTo(newPlayed);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const skip = (seconds: number) => {
    const currentTime = played * duration;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    const newPlayed = newTime / duration;
    setPlayed(newPlayed);
    playerRef.current?.seekTo(newPlayed);
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

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const qualityOptions = ["Auto"];

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden group"
      style={{ aspectRatio: "16/9", userSelect: "none" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 overflow-hidden">
        <ReactPlayer
          ref={playerRef}
          url={processedUrl}
          playing={isPlaying}
          volume={isMuted ? 0 : volume}
          playbackRate={playbackRate}
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0 }}
          onReady={() => {
            setIsReady(true);
            setError(null);
          }}
          onError={(error) => {
            console.error("Player error:", error);
            setError("Falha ao carregar o vídeo.");
          }}
          onDuration={(d) => setDuration(d)}
          onProgress={handleProgress}
          onEnded={() => {
            if (!completed) {
              setIsPlaying(false);
              handleMarkCompleted();
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          config={videoConfig}
          playsinline
          controls={false}
        />
      </div>

      <div
        className="absolute inset-0 cursor-pointer hidden md:block"
        onClick={togglePlay}
        style={{ pointerEvents: showControls || !isPlaying ? "auto" : "none" }}
      />

      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center">
          <p className="text-white text-sm">{error}</p>
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
        style={{ pointerEvents: showControls || !isPlaying ? "auto" : "none" }}
      >
        <div className="mb-3">
          <Slider
            value={[played * 100]}
            max={100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={togglePlay} className="h-10 w-10 sm:h-9 sm:w-9 text-white hover:bg-primary/20 touch-manipulation">
              {isPlaying ? <Pause className="h-5 w-5 sm:h-5 sm:w-5" /> : <Play className="h-5 w-5 sm:h-5 sm:w-5" />}
            </Button>

            <Button variant="ghost" size="icon" onClick={() => skip(-10)} className="h-10 w-10 sm:h-8 sm:w-8 text-white hover:bg-primary/20 touch-manipulation">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => skip(10)} className="h-10 w-10 sm:h-8 sm:w-8 text-white hover:bg-primary/20 touch-manipulation">
              <SkipForward className="h-4 w-4" />
            </Button>

            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8 text-white hover:bg-primary/20">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="w-20 cursor-pointer"
              />
            </div>

            <span className="text-white text-[10px] sm:text-sm font-medium whitespace-nowrap">
              {formatVideoTime(played * duration)} / {formatVideoTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8 text-white hover:bg-primary/20 touch-manipulation">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur">
                <DropdownMenuLabel>Velocidade</DropdownMenuLabel>
                {speedOptions.map((speed) => (
                  <DropdownMenuItem
                    key={speed}
                    onClick={() => setPlaybackRate(speed)}
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

            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-10 w-10 sm:h-8 sm:w-8 text-white hover:bg-primary/20 touch-manipulation">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}