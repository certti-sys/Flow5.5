import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

interface ImageSkeletonProps {
  aspectRatio?: "video" | "square" | "portrait" | "auto";
  className?: string;
}

export function ImageSkeleton({ aspectRatio = "auto", className }: ImageSkeletonProps) {
  const aspectRatioClass = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    auto: "",
  }[aspectRatio];

  return (
    <div
      className={cn(
        "absolute inset-0 skeleton-shimmer bg-gradient-to-r from-muted/50 via-muted to-muted/50",
        aspectRatioClass,
        className
      )}
    />
  );
}

export function CourseImageSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 skeleton-shimmer bg-gradient-to-br from-gold/10 via-background to-background flex items-center justify-center",
        className
      )}
    >
      <Play className="w-16 h-16 text-gold/30 animate-pulse" />
    </div>
  );
}

export function BannerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full h-full skeleton-shimmer bg-gradient-to-br from-background via-muted to-background",
        className
      )}
    />
  );
}

export function AvatarSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-full skeleton-shimmer bg-muted",
        className
      )}
    />
  );
}
