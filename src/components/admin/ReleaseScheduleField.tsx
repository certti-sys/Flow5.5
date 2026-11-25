import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReleaseMode } from "@/lib/release-schedule";

interface ReleaseScheduleFieldProps {
  mode: ReleaseMode;
  afterDays: string;
  atDate: string;
  onModeChange: (mode: ReleaseMode) => void;
  onAfterDaysChange: (value: string) => void;
  onAtDateChange: (value: string) => void;
  /** Módulo pai já bloqueado: avisa que o filho herda a trava. */
  inheritedLock?: string | null;
}

/**
 * Liberação programática (drip) de um módulo ou aula.
 *
 * Os dois modos são exclusivos — o banco tem um CHECK que rejeita os dois
 * preenchidos. Quando o módulo pai está agendado, a aula nunca é liberada antes
 * dele: a data maior vence.
 */
export function ReleaseScheduleField({
  mode,
  afterDays,
  atDate,
  onModeChange,
  onAfterDaysChange,
  onAtDateChange,
  inheritedLock,
}: ReleaseScheduleFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-white/80 font-medium">Liberação</Label>
      <Select value={mode} onValueChange={(v) => onModeChange(v as ReleaseMode)}>
        <SelectTrigger className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white h-[44px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#1C1C1E] border-white/10 text-white rounded-[12px]">
          <SelectItem value="none">Imediata</SelectItem>
          <SelectItem value="days">Após X dias do acesso</SelectItem>
          <SelectItem value="date">Na data</SelectItem>
        </SelectContent>
      </Select>

      {mode === "days" && (
        <Input
          type="number"
          min={1}
          max={3650}
          value={afterDays}
          onChange={(e) => onAfterDaysChange(e.target.value)}
          placeholder="Ex: 7"
          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/80 h-[44px]"
        />
      )}

      {mode === "date" && (
        <Input
          type="date"
          value={atDate}
          onChange={(e) => onAtDateChange(e.target.value)}
          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white h-[44px]"
        />
      )}

      <p className="text-xs text-muted-foreground">
        {mode === "none" &&
          (inheritedLock
            ? `Sem regra própria. Herda o bloqueio do módulo: ${inheritedLock}.`
            : "Disponível desde o primeiro acesso.")}
        {mode === "days" && "Contado a partir da data em que o aluno recebeu acesso ao curso."}
        {mode === "date" && "Data fixa, às 00:00 de Brasília."}
      </p>
    </div>
  );
}
