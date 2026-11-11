import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlatformSettingsContext } from "@/components/PlatformSettingsProvider";

const TITLE_SIZE_CLASS: Record<string, string> = {
  sm: "text-3xl md:text-4xl lg:text-5xl",
  md: "text-4xl md:text-5xl lg:text-6xl",
  lg: "text-5xl md:text-6xl lg:text-7xl",
};

export const HeroBanner = () => {
  const { settings } = usePlatformSettingsContext();
  const titleSizeClass = TITLE_SIZE_CLASS[settings.banner_title_size ?? "md"] ?? TITLE_SIZE_CLASS.md;

  return (
    <section className="relative w-full min-h-[320px] md:min-h-[380px] flex items-end overflow-hidden pt-6 md:pt-10 pb-16 md:pb-20">
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />
      {/* Background with subtle overlay */}
      {settings.banner_background_url ? (
        <div className="absolute inset-0">
          <img
            src={settings.banner_background_url}
            alt="Banner background"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
        </div>
      ) : (
        <>
          <div className="absolute inset-0 bg-[#0a0a0b] animate-glow" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1),transparent_70%)]" />
        </>
      )}

      {/* Modern Fade gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none z-10" />

      {/* Content container - Adjusted to items-end for Netflix Style */}
      <div className="relative z-20 w-full px-4 md:px-6 lg:px-8 flex items-end">
        <div className="w-full max-w-2xl animate-fade-in-up">
          {/* Badge - more refined */}
          {settings.banner_badge_text && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md mb-6 transition-all hover:bg-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[12px] md:text-xs font-medium uppercase tracking-wider text-primary">
                {settings.banner_badge_text}
              </span>
            </div>
          )}

          {/* Title - more balanced sizes */}
          {(settings.banner_title_line1 || settings.banner_title_line2 || settings.banner_title_line3) && (
            <h2
              className={`${titleSizeClass} font-bold text-white leading-[1.1] tracking-tight mb-4`}
              aria-label={[settings.banner_title_line1, settings.banner_title_line2, settings.banner_title_line3]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="block">{settings.banner_title_line1}</span>
              <span className="block text-white/90">{settings.banner_title_line2}</span>
              {settings.banner_title_line3 && (
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                  {settings.banner_title_line3}
                </span>
              )}
            </h2>
          )}

          {/* Subtitle - better readability */}
          {settings.banner_subtitle && (
            <p className="text-base md:text-lg text-white/60 max-w-lg mb-8 leading-relaxed">
              {settings.banner_subtitle}
            </p>
          )}

          {/* Buttons - SOBER PREMIUM DESIGN */}
          {(settings.banner_button_primary_text || settings.banner_button_secondary_text) && (
            <div className="flex flex-col sm:flex-row gap-4">
              {settings.banner_button_primary_text && (
                <Link to={settings.banner_button_primary_link || '/dashboard'} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="relative w-full sm:w-auto px-8 h-12 bg-slate-950 text-white border border-white/10 hover:bg-slate-900 group transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                    <span className="relative z-10 flex items-center gap-2">
                      {settings.banner_button_primary_text}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </Link>
              )}
              {settings.banner_button_secondary_text && (
                <Link to={settings.banner_button_secondary_link || '/perfil'} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto px-8 h-12 border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-md transition-all duration-300"
                  >
                    {settings.banner_button_secondary_text}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
