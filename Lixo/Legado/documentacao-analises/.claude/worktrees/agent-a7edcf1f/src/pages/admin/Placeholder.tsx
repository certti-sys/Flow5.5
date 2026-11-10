import { Card, CardContent } from "@/components/ui/card";

interface PlaceholderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function Placeholder({ title, description, icon }: PlaceholderProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Card className="glass-card border-white/10">
        <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            {icon}
          </div>
          <p className="text-muted-foreground text-center">
            Esta seção está em desenvolvimento
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
