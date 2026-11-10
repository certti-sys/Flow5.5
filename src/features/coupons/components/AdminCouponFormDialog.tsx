import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Coupon } from "@/features/coupons/types";
import { couponFormSchema, CouponFormValues } from "@/features/coupons/schemas/couponFormSchema";

interface Product {
  id: string;
  name: string;
}

interface AdminCouponFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon?: Coupon | null;
  products?: Product[];
}

export function AdminCouponFormDialog({
  open,
  onOpenChange,
  coupon,
  products = [],
}: AdminCouponFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!coupon;

  const form = useForm<CouponFormValues>({
    defaultValues: {
      code: "",
      discount_type: "percent",
      discount_value: 10,
      max_uses: null,
      valid_from: null,
      valid_until: null,
      min_purchase_amount: 0,
      is_active: true,
      product_ids: [],
    },
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Preencher formulário ao editar
  useEffect(() => {
    if (coupon) {
      form.reset({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_uses: coupon.max_uses ?? null,
        valid_from: coupon.valid_from ? coupon.valid_from.slice(0, 10) : null,
        valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 10) : null,
        min_purchase_amount: coupon.min_purchase_amount ?? 0,
        is_active: coupon.is_active,
        product_ids: [],
      });
    } else {
      form.reset({
        code: "",
        discount_type: "percent",
        discount_value: 10,
        max_uses: null,
        valid_from: null,
        valid_until: null,
        min_purchase_amount: 0,
        is_active: true,
        product_ids: [],
      });
    }
  }, [coupon, open, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: CouponFormValues) => {
      const couponPayload = {
        code: values.code.toUpperCase(),
        discount_type: values.discount_type,
        discount_value: values.discount_value,
        max_uses: values.max_uses || null,
        valid_from: values.valid_from || null,
        valid_until: values.valid_until || null,
        min_purchase_amount: values.min_purchase_amount,
        is_active: values.is_active,
      };

      if (isEditing && coupon) {
        // Atualizar cupom existente
        const { error } = await supabase
          .from("coupons")
          .update(couponPayload)
          .eq("id", coupon.id);
        if (error) throw error;

        // Atualizar vínculos de produtos
        await supabase.from("coupon_products").delete().eq("coupon_id", coupon.id);
        if (values.product_ids.length > 0) {
          const links = values.product_ids.map((pid) => ({
            coupon_id: coupon.id,
            product_id: pid,
          }));
          const { error: linkError } = await supabase.from("coupon_products").insert(links);
          if (linkError) throw linkError;
        }
      } else {
        // Criar novo cupom
        const { data: newCoupon, error } = await supabase
          .from("coupons")
          .insert(couponPayload)
          .select()
          .single();
        if (error) throw error;

        // Vincular produtos
        if (values.product_ids.length > 0 && newCoupon) {
          const links = values.product_ids.map((pid) => ({
            coupon_id: newCoupon.id,
            product_id: pid,
          }));
          const { error: linkError } = await supabase.from("coupon_products").insert(links);
          if (linkError) throw linkError;
        }
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Cupom atualizado com sucesso!" : "Cupom criado com sucesso!", {
        style: { background: "#111", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
      });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar cupom");
    },
  });

  const onSubmit = (values: CouponFormValues) => {
    const validation = couponFormSchema.safeParse(values);
    if (!validation.success) {
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          form.setError(err.path[0] as string, { message: err.message });
        }
      });
      return;
    }
    saveMutation.mutate(values);
  };

  const onInvalid = () => {
    const firstError = Object.values(form.formState.errors)[0];
    toast.error(firstError?.message ? String(firstError.message) : "Revise os campos obrigatórios do cupom");
  };

  const toggleProduct = (productId: string) => {
    const current = form.getValues("product_ids");
    if (current.includes(productId)) {
      form.setValue("product_ids", current.filter((id) => id !== productId));
    } else {
      form.setValue("product_ids", [...current, productId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-black uppercase tracking-tight">
            {isEditing ? "Editar Cupom" : "Novo Cupom"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6 py-2">
            {/* Linha 1: Código e Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código do Cupom *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: DESCONTO20"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        className="font-mono uppercase"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <div className="flex items-center gap-3 h-10 mt-1">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">
                        {field.value ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Linha 2: Tipo e Valor */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discount_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Desconto *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percent">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valor do Desconto *{" "}
                      <span className="text-muted-foreground">
                        {form.watch("discount_type") === "percent" ? "(%)" : "(R$)"}
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={form.watch("discount_type") === "percent" ? "Ex: 15" : "Ex: 29.90"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Linha 3: Limite de uso e Valor mínimo */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="max_uses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Limite de Usos <span className="text-muted-foreground">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Sem limite"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="min_purchase_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Mínimo da Compra (R$)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 50.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Linha 4: Validade */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Válido a Partir de <span className="text-muted-foreground">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Válido até <span className="text-muted-foreground">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Linha 5: Produtos */}
            {products.length > 0 && (
              <FormField
                control={form.control}
                name="product_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restringir a Produtos <span className="text-muted-foreground">(opcional — deixe em branco para todos)</span></FormLabel>
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border rounded-lg p-3 border-white/10">
                      {products.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => toggleProduct(product.id)}
                          className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            field.value.includes(product.id)
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-white/5 text-muted-foreground hover:bg-white/10"
                          }`}
                        >
                          {product.name}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  isEditing ? "Salvar Alterações" : "Criar Cupom"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

