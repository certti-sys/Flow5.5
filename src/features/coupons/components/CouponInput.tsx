import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Tag, CheckCircle2 } from 'lucide-react';
import { useCouponValidation } from '../hooks/useCouponValidation';
import type { CouponValidationResult } from '../types';

interface CouponInputProps {
  productId: string;
  amount: number;
  onApply: (result: CouponValidationResult) => void;
  disabled?: boolean;
}

export function CouponInput({ productId, amount, onApply, disabled }: CouponInputProps) {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState(false);
  const validateMutation = useCouponValidation();

  const handleApply = async () => {
    if (!code.trim()) {
      toast.error('Digite um código de cupom');
      return;
    }

    try {
      const result = await validateMutation.mutateAsync({
        code: code.trim().toUpperCase(),
        productId,
        amount
      });

      if (result.valid) {
        setApplied(true);
        onApply(result);
        toast.success(
          `Cupom aplicado! Desconto: R$ ${result.discount_applied?.toFixed(2)}`,
          { icon: <CheckCircle2 className="text-green-500" /> }
        );
      } else {
        toast.error(result.error || 'Cupom inválido');
      }
    } catch (error) {
      toast.error('Erro ao validar cupom');
      console.error(error);
    }
  };

  const handleRemove = () => {
    setCode('');
    setApplied(false);
    onApply({ valid: false });
    toast.info('Cupom removido');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Cupom de desconto</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Digite o código"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={disabled || applied || validateMutation.isPending}
            className="pl-10"
            maxLength={50}
          />
        </div>

        {!applied ? (
          <Button
            type="button"
            onClick={handleApply}
            disabled={disabled || !code.trim() || validateMutation.isPending}
            variant="outline"
          >
            {validateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Aplicar'
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            variant="destructive"
          >
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}