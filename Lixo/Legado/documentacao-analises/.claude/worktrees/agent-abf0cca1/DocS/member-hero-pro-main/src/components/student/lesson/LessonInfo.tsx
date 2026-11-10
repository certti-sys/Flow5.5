interface LessonInfoProps {
  nome: string;
  descricao?: string | null;
}

export function LessonInfo({ nome, descricao }: LessonInfoProps) {
  return (
    <div className="space-y-3 pt-4">
      <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground leading-tight">
        {nome}
      </h2>
      
      {descricao && (
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
          {descricao}
        </p>
      )}
    </div>
  );
}
