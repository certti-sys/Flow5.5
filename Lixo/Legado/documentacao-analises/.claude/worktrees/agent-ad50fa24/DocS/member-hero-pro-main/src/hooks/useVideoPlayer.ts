import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoPlayerState } from '@/types/video';

export function useVideoPlayer(onTimeUpdate?: (time: number) => void) {
  const [state, setState] = useState<VideoPlayerState>({
    playing: false,
    volume: 1,
    muted: false,
    playbackRate: 1,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    seeking: false,
  });

  const playerRef = useRef<any>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = useCallback(() => {
    setState((prev) => ({ ...prev, playing: !prev.playing }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState((prev) => ({ ...prev, volume: Math.max(0, Math.min(1, volume)), muted: false }));
  }, []);

  const toggleMute = useCallback(() => {
    setState((prev) => ({ ...prev, muted: !prev.muted }));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setState((prev) => ({ ...prev, playbackRate: rate }));
  }, []);

  const seekTo = useCallback((time: number) => {
    setState((prev) => ({ ...prev, currentTime: time, seeking: true }));
    setTimeout(() => {
      setState((prev) => ({ ...prev, seeking: false }));
    }, 100);
  }, []);

  const handleTimeUpdate = useCallback(
    (time: number) => {
      setState((prev) => ({ ...prev, currentTime: time }));
    },
    []
  );

  // Auto-save progress every 10 seconds
  useEffect(() => {
    if (state.playing && onTimeUpdate) {
      saveIntervalRef.current = setInterval(() => {
        onTimeUpdate(state.currentTime);
      }, 10000);
    } else {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [state.playing, state.currentTime, onTimeUpdate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekTo(Math.max(0, state.currentTime - 10));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekTo(Math.min(state.duration, state.currentTime + 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(state.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(state.volume - 0.1);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case '<':
          e.preventDefault();
          setPlaybackRate(Math.max(0.25, state.playbackRate - 0.25));
          break;
        case '>':
          e.preventDefault();
          setPlaybackRate(Math.min(2, state.playbackRate + 0.25));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state, togglePlay, seekTo, setVolume, toggleMute, setPlaybackRate]);

  return {
    state,
    setState,
    playerRef,
    togglePlay,
    setVolume,
    toggleMute,
    setPlaybackRate,
    seekTo,
    handleTimeUpdate,
  };
}
