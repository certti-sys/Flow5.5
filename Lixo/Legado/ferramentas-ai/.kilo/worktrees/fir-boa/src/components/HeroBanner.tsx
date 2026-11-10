import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlatformSettingsContext } from "@/components/PlatformSettingsProvider";

export const HeroBanner = () => {
  const { settings } = usePlatformSettingsContext();

  return (
    <section className="relative w-full h-[45vh] min-h-[400px] md:h-[50vh] md:min-h-[520px] overflow-hidden">
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
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none z-10" />

      {/* Content container */}
      <div className="relative z-20 h-full w-full px-4 md:px-6 lg:px-8 flex items-center">
        <div className="w-full max-w-2xl animate-fade-in-up">
          {/* Badge - more refined */}
          {settings.banner_badge_text && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md mb-6 transition-all hover:bg-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[10px] md:text-xs font-medium uppercase tracking-wider text-primary-foreground/90">
                {settings.banner_badge_text}
              </span>
            </div>
          )}

          {/* Title - more balanced sizes */}
          {(settings.banner_title_line1 || settings.banner_title_line2 || settings.banner_title_line3) && (
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-4">
              <span className="block">{settings.banner_title_line1}</span>
              <span className="block text-white/90">{settings.banner_title_line2}</span>
              {settings.banner_title_line3 && (
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                  {settings.banner_title_line3}
                </span>
              )}
            </h1>
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
