import { Button } from "@/components/ui/button";

interface ContactInfoProps {
  icon: string;
  label: string;
  value: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const ContactInfo = ({ icon, label, value, action }: ContactInfoProps) => {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-xl group-hover:scale-110 transition-transform flex-shrink-0">
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
            {label}
          </p>
          <p className="text-sm font-medium truncate">
            {value}
          </p>
        </div>
      </div>
      
      {action && (
        <Button
          onClick={action.onClick}
          size="sm"
          variant="outline"
          className="glass-card border-white/20 hover:border-primary/50 hover:bg-primary/10 text-xs h-8 flex-shrink-0"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
