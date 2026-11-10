import { ReactNode } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  title: string;
  description?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actionButton?: ReactNode;
  filters?: ReactNode;
  showSearch?: boolean;
}

export function AdminHeader({
  title,
  description,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  actionButton,
  filters,
  showSearch = true,
}: AdminHeaderProps) {
  return (
    <div className="flex flex-col gap-6 mb-8">
      {/* Upper part: Title and Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-[14px] text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
        
        {actionButton && (
          <div className="flex shrink-0">
            {actionButton}
          </div>
        )}
      </div>

      {/* Lower part: the actual "Super Bar" */}
      {(showSearch || filters) && (
      <motion.div 
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card p-2 rounded-[16px] border-white/10 flex flex-col sm:flex-row items-center gap-3 backdrop-blur-xl bg-white/[0.02]"
      >
        {showSearch && (
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 pl-11 pr-11 bg-white/[0.03] border-white/5 focus:border-primary/50 focus:ring-primary/20 rounded-[12px] transition-all"
            />
            <AnimatePresence>
              {searchValue && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => onSearchChange?.("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}

        {filters && (
          <div className="relative flex-1 w-full sm:w-auto overflow-hidden">
            {/* Left Gradient Mask */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#171719] to-transparent z-10 pointer-events-none opacity-0 sm:group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide snap-x snap-mandatory px-2">
              {filters}
            </div>

            {/* Right Gradient Mask */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#171719] to-transparent z-10 pointer-events-none" />
          </div>
        )}
      </motion.div>
      )}
    </div>
  );
}
