import { useState, useEffect, useRef } from "react";
import { Check, Cloud, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

const STORAGE_KEYS = ['memberhero_courses', 'memberhero_modulos', 'memberhero_aulas'];

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Store original setItem
    const originalSetItem = localStorage.setItem.bind(localStorage);

    // Override setItem to detect saves
    localStorage.setItem = function(key: string, value: string) {
      originalSetItem(key, value);
      
      if (STORAGE_KEYS.includes(key)) {
        // Clear any existing timeouts
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

        // Show syncing state
        setStatus("syncing");

        // After a short delay, show synced
        timeoutRef.current = setTimeout(() => {
          setStatus("synced");
          setLastSyncTime(new Date());

          // After 3 seconds, go back to idle
          idleTimeoutRef.current = setTimeout(() => {
            setStatus("idle");
          }, 3000);
        }, 400);
      }
    };

    // Listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && STORAGE_KEYS.includes(e.key)) {
        setStatus("synced");
        setLastSyncTime(new Date());
        
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = setTimeout(() => {
          setStatus("idle");
        }, 3000);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      // Restore original setItem
      localStorage.setItem = originalSetItem;
      window.removeEventListener('storage', handleStorageChange);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, []);

  const statusConfig = {
    idle: { 
      icon: Cloud, 
      text: "Pronto", 
      iconColor: "text-muted-foreground",
      textColor: "text-muted-foreground"
    },
    syncing: { 
      icon: Loader2, 
      text: "Salvando...", 
      iconColor: "text-primary animate-spin",
      textColor: "text-primary"
    },
    synced: { 
      icon: Check, 
      text: "Salvo", 
      iconColor: "text-green-500",
      textColor: "text-green-500"
    },
    error: { 
      icon: CloudOff, 
      text: "Erro", 
      iconColor: "text-destructive",
      textColor: "text-destructive"
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/50 border border-border/50 text-sm transition-all duration-300">
      <Icon className={cn("h-4 w-4 transition-colors", config.iconColor)} />
      <span className={cn("transition-colors", config.textColor)}>{config.text}</span>
      {lastSyncTime && status === "idle" && (
        <span className="text-xs text-muted-foreground/70">
          ({formatTime(lastSyncTime)})
        </span>
      )}
    </div>
  );
}
