export interface VideoPlayerState {
  playing: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  buffered: number;
  seeking: boolean;
}

export interface VideoMarker {
  id: string;
  tempo: number;
  titulo: string;
  descricao?: string;
  tipo: 'importante' | 'exercicio' | 'resumo' | 'dica';
}

export type VideoProvider = 'youtube' | 'vimeo' | 'panda_video' | 'host_vsl' | 'direct';

export interface VideoPlayerProps {
  url: string;
  provider: VideoProvider;
  markers?: VideoMarker[];
  startTime?: number;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  className?: string;
}
