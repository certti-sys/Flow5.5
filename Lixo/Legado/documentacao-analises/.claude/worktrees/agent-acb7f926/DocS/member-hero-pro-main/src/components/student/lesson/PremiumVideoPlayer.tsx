import { useEffect, useRef, useState } from "react";
import YouTube, { YouTubePlayer } from "react-youtube";
import Player from "@vimeo/player";
import { VideoPlayerProps } from "@/types/video";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { VideoControls } from "./VideoControls";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

export function PremiumVideoPlayer({
  url,
  provider,
  markers = [],
  startTime = 0,
  onTimeUpdate,
  onEnded,
  className = "",
}: VideoPlayerProps) {
  const {
    state,
    setState,
    playerRef,
    togglePlay,
    setVolume,
    toggleMute,
    setPlaybackRate,
    seekTo,
    handleTimeUpdate,
  } = useVideoPlayer(onTimeUpdate);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const vimeoPlayerRef = useRef<Player | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extract video ID based on provider
  const getVideoId = () => {
    if (provider === "youtube") {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([\w-]+)/);
      return match ? match[1] : "";
    }
    if (provider === "vimeo") {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? match[1] : "";
    }
    return "";
  };

  const videoId = getVideoId();

  // Show resume prompt if startTime > 30 seconds
  useEffect(() => {
    if (startTime > 30) {
      setShowResumePrompt(true);
    }
  }, [startTime]);

  const handleResume = () => {
    seekTo(startTime);
    setShowResumePrompt(false);
    togglePlay();
  };

  const handleStartOver = () => {
    seekTo(0);
    setShowResumePrompt(false);
    togglePlay();
  };

  // YouTube Player Setup
  const onYouTubeReady = (event: { target: YouTubePlayer }) => {
    playerRef.current = event.target;
    const duration = event.target.getDuration();
    setState((prev) => ({ ...prev, duration }));

    // Start time update loop
    updateIntervalRef.current = setInterval(async () => {
      if (playerRef.current) {
        const currentTime = await playerRef.current.getCurrentTime();
        const playerState = await playerRef.current.getPlayerState();
        handleTimeUpdate(currentTime);
        setState((prev) => ({
          ...prev,
          currentTime,
          playing: playerState === 1,
        }));
      }
    }, 500);
  };

  const onYouTubeStateChange = (event: { data: number }) => {
    // 0 = ended, 1 = playing, 2 = paused
    if (event.data === 0 && onEnded) {
      onEnded();
    }
  };

  // Vimeo Player Setup
  useEffect(() => {
    if (provider === "vimeo" && videoId) {
      const iframe = document.querySelector(`#vimeo-player-${videoId}`) as HTMLIFrameElement;
      if (iframe) {
        const player = new Player(iframe);
        vimeoPlayerRef.current = player;
        playerRef.current = player;

        player.getDuration().then((duration) => {
          setState((prev) => ({ ...prev, duration }));
        });

        player.on("timeupdate", (data) => {
          handleTimeUpdate(data.seconds);
          setState((prev) => ({ ...prev, currentTime: data.seconds }));
        });

        player.on("play", () => {
          setState((prev) => ({ ...prev, playing: true }));
        });

        player.on("pause", () => {
          setState((prev) => ({ ...prev, playing: false }));
        });

        player.on("ended", () => {
          if (onEnded) onEnded();
        });
      }
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [provider, videoId]);

  // Sync player state with controls
  useEffect(() => {
    if (!playerRef.current) return;

    if (provider === "youtube") {
      const player = playerRef.current as YouTubePlayer;
      if (state.playing) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } else if (provider === "vimeo" && vimeoPlayerRef.current) {
      if (state.playing) {
        vimeoPlayerRef.current.play();
      } else {
        vimeoPlayerRef.current.pause();
      }
    }
  }, [state.playing, provider]);

  useEffect(() => {
    if (!playerRef.current) return;

    if (provider === "youtube") {
      const player = playerRef.current as YouTubePlayer;
      player.setVolume(state.muted ? 0 : state.volume * 100);
    } else if (provider === "vimeo" && vimeoPlayerRef.current) {
      vimeoPlayerRef.current.setVolume(state.muted ? 0 : state.volume);
    }
  }, [state.volume, state.muted, provider]);

  useEffect(() => {
    if (!playerRef.current) return;

    if (provider === "youtube") {
      const player = playerRef.current as YouTubePlayer;
      player.setPlaybackRate(state.playbackRate);
    } else if (provider === "vimeo" && vimeoPlayerRef.current) {
      vimeoPlayerRef.current.setPlaybackRate(state.playbackRate);
    }
  }, [state.playbackRate, provider]);

  useEffect(() => {
    if (!playerRef.current || !state.seeking) return;

    if (provider === "youtube") {
      const player = playerRef.current as YouTubePlayer;
      player.seekTo(state.currentTime, true);
    } else if (provider === "vimeo" && vimeoPlayerRef.current) {
      vimeoPlayerRef.current.setCurrentTime(state.currentTime);
    }
  }, [state.seeking, state.currentTime, provider]);

  // Fullscreen handling
  const handleFullscreenToggle = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`relative group ${className}`}
      onContextMenu={(e) => e.preventDefault()} // Bloqueia clique direito
    >
      <AspectRatio ratio={16 / 9} className="bg-black rounded-lg overflow-hidden">
        {/* Resume Prompt Overlay */}
        {showResumePrompt && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
            <div className="glass-panel p-8 max-w-md space-y-4 text-center">
              <Play className="w-12 h-12 text-primary mx-auto" />
              <h3 className="text-xl font-bold text-white">Retomar de onde parou?</h3>
              <p className="text-white/70">
                Você assistiu até {Math.floor(startTime / 60)}:{String(Math.floor(startTime % 60)).padStart(2, '0')}
              </p>
              <div className="flex gap-3">
                <Button onClick={handleStartOver} variant="outline" className="flex-1">
                  Começar do Início
                </Button>
                <Button onClick={handleResume} className="btn-premium flex-1">
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Video Player */}
        {provider === "youtube" && videoId && (
          <YouTube
            videoId={videoId}
            onReady={onYouTubeReady}
            onStateChange={onYouTubeStateChange}
            opts={{
              width: "100%",
              height: "100%",
              playerVars: {
                autoplay: 0,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                fs: 0,
                iv_load_policy: 3,
              },
            }}
            className="w-full h-full"
            iframeClassName="w-full h-full"
          />
        )}

        {provider === "vimeo" && videoId && (
          <iframe
            id={`vimeo-player-${videoId}`}
            src={`https://player.vimeo.com/video/${videoId}?controls=0&autoplay=0`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        )}


        {/* Custom Controls Overlay */}
        <VideoControls
          playing={state.playing}
          volume={state.volume}
          muted={state.muted}
          playbackRate={state.playbackRate}
          currentTime={state.currentTime}
          duration={state.duration}
          buffered={state.buffered}
          isFullscreen={isFullscreen}
          markers={markers}
          onPlayPause={togglePlay}
          onVolumeChange={setVolume}
          onMuteToggle={toggleMute}
          onPlaybackRateChange={setPlaybackRate}
          onSeek={seekTo}
          onFullscreenToggle={handleFullscreenToggle}
        />
      </AspectRatio>

      {/* Keyboard Shortcuts Helper */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-xs text-white/50 bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
          Space: Play/Pause • ←→: Seek • ↑↓: Volume • M: Mute • &lt;&gt;: Speed
        </div>
      </div>
    </div>
  );
}
