import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

interface ContactCardProps {
  email?: string;
  whatsapp?: string;
}

export const ContactCard = ({ email, whatsapp }: ContactCardProps) => {
  const handleCopyEmail = () => {
    if (email) {
      navigator.clipboard.writeText(email);
      toast.success("Email copiado!");
    }
  };

  const handleOpenWhatsApp = () => {
    if (whatsapp) {
      const phoneNumber = whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-card p-4">
      <h3 className="font-semibold mb-3 text-sm">📧 Contato</h3>
      <div className="space-y-3">
        {email && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleCopyEmail}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        
        {whatsapp && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{whatsapp}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleOpenWhatsApp}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
