interface VideoTimestampProps {
  currentTime: number;
  duration: number;
}

export function VideoTimestamp({ currentTime, duration }: VideoTimestampProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-1 text-sm font-medium text-white/90 min-w-[100px]">
      <span>{formatTime(currentTime)}</span>
      <span className="text-white/50">/</span>
      <span className="text-white/70">{formatTime(duration)}</span>
    </div>
  );
}
