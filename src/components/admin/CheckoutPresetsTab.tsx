import { PresetGallery } from "@/components/admin/PresetGallery";

interface CheckoutPresetsTabProps {
    /** Preset salvo no produto. `null` = cores manuais do produto. */
    value: string | null;
    onChange: (presetId: string | null) => void;
}

/** Presets do checkout público. Só afeta a página de vendas do produto. */
export function CheckoutPresetsTab({ value, onChange }: CheckoutPresetsTabProps) {
    return (
        <div className="space-y-4">
            <PresetGallery
                value={value}
                onChange={onChange}
                resetLabel="Padrão do checkout"
                resetHint="Reset: remove o preset e volta às cores manuais deste produto."
            />
        </div>
    );
}
