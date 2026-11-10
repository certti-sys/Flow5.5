interface VideoPlayerProps {
  videoUrl: string;
  title: string;
}

export const VideoPlayer = ({ videoUrl, title }: VideoPlayerProps) => {
  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
      <iframe
        src={videoUrl}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
