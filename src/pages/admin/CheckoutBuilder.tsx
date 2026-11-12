import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    CHECKOUT_IMAGE_FORMATS,
    DEFAULT_CHECKOUT_CONFIG,
    newCheckoutBlockId,
    normalizeCheckoutConfig,
    type CheckoutConfig,
    type CheckoutContentBlock,
    type CheckoutReview,
} from "@/types/checkout-config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Copy, ExternalLink, Eye, Image as ImageIcon, Loader2, Plus,
    Save, ShoppingCart, Trash2, Type,
} from "lucide-react";

interface BuilderProduct {
    id: string;
    name: string;
    price: number | null;
    active: boolean;
    checkout_slug: string | null;
    checkout_config: unknown;
}

const inputClass = "bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 h-11";

function SectionCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <Card className="bg-white/[0.02] border-white/5">
            <CardHeader className="pb-4">
                <CardTitle className="text-[15px] font-semibold text-white/90">{title}</CardTitle>
                {description && <p className="text-[12px] text-muted-foreground">{description}</p>}
            </CardHeader>
            <CardContent className="space-y-4">{children}</CardContent>
        </Card>
    );
}

export default function CheckoutBuilder() {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedFromUrl = searchParams.get("product");

    const { data: products, isLoading: loadingProducts } = useQuery({
        queryKey: ["checkout-builder-products"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("products")
                .select("id, name, price, active, checkout_slug, checkout_config")
                .order("name");
            if (error) throw error;
            return (data ?? []) as BuilderProduct[];
        },
    });

    const product = useMemo(
        () => products?.find((item) => item.id === selectedFromUrl) ?? products?.[0] ?? null,
        [products, selectedFromUrl],
    );

    const [config, setConfig] = useState<CheckoutConfig>(DEFAULT_CHECKOUT_CONFIG);
    const [slug, setSlug] = useState("");
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (!product) return;
        setConfig(normalizeCheckoutConfig(product.checkout_config));
        setSlug(product.checkout_slug ?? "");
        setDirty(false);
    }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const patch = (updater: (current: CheckoutConfig) => CheckoutConfig) => {
        setConfig((current) => updater(current));
        setDirty(true);
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!product) throw new Error("Selecione um produto");

            const trimmedSlug = slug.trim().toLowerCase();
            if (trimmedSlug && !/^[a-z0-9-]{3,40}$/.test(trimmedSlug)) {
                throw new Error("Slug inválido: use 3–40 caracteres entre a-z, 0-9 e hífen.");
            }

            const { error } = await supabase
                .from("products")
                .update({
                    checkout_config: config,
                    checkout_slug: trimmedSlug || null,
                })
                .eq("id", product.id);

            if (error) {
                if (error.code === "23505") throw new Error("Este slug já está em uso por outro produto.");
                throw error;
            }
        },
        onSuccess: () => {
            toast.success("Checkout atualizado");
            setDirty(false);
            queryClient.invalidateQueries({ queryKey: ["checkout-builder-products"] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const checkoutUrl = product
        ? `${window.location.origin}/c/${slug || product.checkout_slug || ""}`
        : "";

    const copyLink = async () => {
        if (!checkoutUrl) return;
        await navigator.clipboard.writeText(checkoutUrl);
        toast.success("Link copiado");
    };

    const addBlock = (type: "image" | "text") => {
        const block: CheckoutContentBlock = type === "text"
            ? { id: newCheckoutBlockId(), type: "text", title: "", body: "", align: "center" }
            : {
                id: newCheckoutBlockId(),
                type: "image",
                url: "",
                format: "wide",
                placement: "main",
                link: "",
                alt: "",
            };

        patch((current) => ({
            ...current,
            appearance: {
                ...current.appearance,
                content_blocks: [...current.appearance.content_blocks, block],
            },
        }));
    };

    const updateBlock = (id: string, changes: Partial<CheckoutContentBlock>) => {
        patch((current) => ({
            ...current,
            appearance: {
                ...current.appearance,
                content_blocks: current.appearance.content_blocks.map((block) =>
                    block.id === id ? ({ ...block, ...changes } as CheckoutContentBlock) : block
                ),
            },
        }));
    };

    const removeBlock = (id: string) => {
        patch((current) => ({
            ...current,
            appearance: {
                ...current.appearance,
                content_blocks: current.appearance.content_blocks.filter((block) => block.id !== id),
            },
        }));
    };

    const addReview = () => {
        const review: CheckoutReview = {
            photo: "",
            author: "",
            description: "",
            stars: 5,
            verified_badge: true,
            testimonial_image: "",
        };

        patch((current) => ({ ...current, reviews: [...current.reviews, review] }));
    };

    const updateReview = (index: number, changes: Partial<CheckoutReview>) => {
        patch((current) => ({
            ...current,
            reviews: current.reviews.map((review, i) => (i === index ? { ...review, ...changes } : review)),
        }));
    };

    const removeReview = (index: number) => {
        patch((current) => ({
            ...current,
            reviews: current.reviews.filter((_, i) => i !== index),
        }));
    };

    if (loadingProducts) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!products || products.length === 0) {
        return (
            <div className="space-y-6">
                <AdminHeader title="Checkout" description="Personalize a página de vendas" showSearch={false} />
                <Card className="bg-white/[0.02] border-white/5">
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                        <p className="text-white/80 font-medium">Nenhum produto cadastrado</p>
                        <p className="text-sm text-muted-foreground">
                            Crie um produto em Comercial → Produtos para personalizar o checkout.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <AdminHeader
                title="Checkout"
                description="Personalize a página de vendas e o link público do produto"
                showSearch={false}
                actionButton={
                    <Button
                        onClick={() => saveMutation.mutate()}
                        disabled={!dirty || saveMutation.isPending}
                        className="rounded-xl"
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Salvar alterações
                    </Button>
                }
            />

            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <div className="space-y-4">
                    <Card className="bg-white/[0.02] border-white/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Produto
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Select
                                value={product?.id ?? ""}
                                onValueChange={(value) => setSearchParams({ product: value })}
                            >
                                <SelectTrigger className={cn(inputClass, "text-left")}>
                                    <SelectValue placeholder="Selecione um produto" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="space-y-1.5">
                                <Label className="text-[12px] text-white/70">Slug do checkout</Label>
                                <Input
                                    value={slug}
                                    onChange={(event) => {
                                        setSlug(event.target.value);
                                        setDirty(true);
                                    }}
                                    placeholder="meu-curso"
                                    className={inputClass}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Link: <span className="text-white/70">/c/{slug || "..."}</span>
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="justify-start rounded-lg border-white/10 bg-white/[0.03]"
                                    onClick={copyLink}
                                >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copiar link
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="justify-start rounded-lg border-white/10 bg-white/[0.03]"
                                >
                                    <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Abrir checkout
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/[0.02] border-white/5">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                                <Eye className="h-4 w-4" />
                                As alterações aparecem no checkout público após salvar.
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="geral" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3 gap-1 rounded-xl border border-white/5 bg-white/[0.03] p-1 sm:grid-cols-6">
                        <TabsTrigger value="geral">Geral</TabsTrigger>
                        <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
                        <TabsTrigger value="campos">Campos</TabsTrigger>
                        <TabsTrigger value="social">Social</TabsTrigger>
                        <TabsTrigger value="contato">Contato</TabsTrigger>
                        <TabsTrigger value="avancado">Avançado</TabsTrigger>
                    </TabsList>

                    {/* GERAL */}
                    <TabsContent value="geral" className="space-y-4">
                        <SectionCard title="Identidade" description="Logo, banner e cores da página">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] text-white/70">Logo (URL)</Label>
                                    <Input
                                        value={config.logo_url ?? ""}
                                        onChange={(event) => patch((current) => ({ ...current, logo_url: event.target.value }))}
                                        placeholder="https://..."
                                        className={inputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] text-white/70">Banner do topo (URL)</Label>
                                    <Input
                                        value={config.banner_url ?? ""}
                                        onChange={(event) => patch((current) => ({ ...current, banner_url: event.target.value }))}
                                        placeholder="https://..."
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            {config.logo_url && (
                                <div className="rounded-lg border border-white/5 bg-black/20 p-4">
                                    <img src={config.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
                                </div>
                            )}
                        </SectionCard>

                        <SectionCard title="Cores e botão" description="Aparência do botão de compra e do fundo">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {[
                                    { key: "primary_color", label: "Cor primária" },
                                    { key: "background_color", label: "Fundo da página" },
                                    { key: "buy_button_color", label: "Cor do botão" },
                                ].map((field) => (
                                    <div key={field.key} className="space-y-1.5">
                                        <Label className="text-[12px] text-white/70">{field.label}</Label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={
                                                    (config.appearance[field.key as keyof CheckoutConfig["appearance"]] as string)
                                                    || "#7C3AED"
                                                }
                                                onChange={(event) =>
                                                    patch((current) => ({
                                                        ...current,
                                                        appearance: { ...current.appearance, [field.key]: event.target.value },
                                                    }))
                                                }
                                                className="h-11 w-12 shrink-0 cursor-pointer rounded-md border border-white/10 bg-transparent"
                                            />
                                            <Input
                                                value={
                                                    (config.appearance[field.key as keyof CheckoutConfig["appearance"]] as string)
                                                    || ""
                                                }
                                                onChange={(event) =>
                                                    patch((current) => ({
                                                        ...current,
                                                        appearance: { ...current.appearance, [field.key]: event.target.value },
                                                    }))
                                                }
                                                placeholder="#7C3AED"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[12px] text-white/70">Texto do botão</Label>
                                <Input
                                    value={config.appearance.buy_button_text}
                                    onChange={(event) =>
                                        patch((current) => ({
                                            ...current,
                                            appearance: { ...current.appearance, buy_button_text: event.target.value },
                                        }))
                                    }
                                    placeholder="Comprar agora"
                                    className={inputClass}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Deixe vazio para usar “Pagar” + o valor total.
                                </p>
                            </div>
                        </SectionCard>

                        <SectionCard title="Resumo do pedido" description="Preço anterior e selo de desconto">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] text-white/70">Preço anterior (R$)</Label>
                                    <Input
                                        inputMode="decimal"
                                        value={config.summary.previous_price != null
                                            ? (config.summary.previous_price / 100).toFixed(2).replace(".", ",")
                                            : ""}
                                        onChange={(event) => {
                                            const cents = parseInt(event.target.value.replace(/\D/g, ""), 10) || 0;
                                            patch((current) => ({
                                                ...current,
                                                summary: { ...current.summary, previous_price: cents || null },
                                            }));
                                        }}
                                        placeholder="0,00"
                                        className={inputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] text-white/70">Texto de desconto</Label>
                                    <Input
                                        value={config.summary.discount_text}
                                        onChange={(event) =>
                                            patch((current) => ({
                                                ...current,
                                                summary: { ...current.summary, discount_text: event.target.value },
                                            }))
                                        }
                                        placeholder="50% OFF"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                                <div>
                                    <p className="text-[13px] font-medium text-white/80">Mostrar descrição</p>
                                    <p className="text-[11px] text-muted-foreground">Exibe a descrição do produto no resumo.</p>
                                </div>
                                <Switch
                                    checked={config.summary.show_description}
                                    onCheckedChange={(checked) =>
                                        patch((current) => ({
                                            ...current,
                                            summary: { ...current.summary, show_description: checked },
                                        }))
                                    }
                                />
                            </div>
                        </SectionCard>

                        <SectionCard title="Pós-compra" description="Redirecionamento após o pagamento aprovado">
                            <div className="space-y-1.5">
                                <Label className="text-[12px] text-white/70">URL de destino</Label>
                                <Input
                                    value={config.redirect_after_purchase}
                                    onChange={(event) =>
                                        patch((current) => ({ ...current, redirect_after_purchase: event.target.value }))
                                    }
                                    placeholder="https://sua-area-de-membros.com"
                                    className={inputClass}
                                />
                            </div>
                        </SectionCard>
                    </TabsContent>

                    {/* CONTEÚDO */}
                    <TabsContent value="conteudo" className="space-y-4">
                        <SectionCard title="Vídeo" description="Incorpora um vídeo do YouTube">
                            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] text-white/70">URL do YouTube</Label>
                                    <Input
                                        value={config.youtube_url}
                                        onChange={(event) => patch((current) => ({ ...current, youtube_url: event.target.value }))}
                                        placeholder="https://youtube.com/watch?v=..."
                                        className={inputClass}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[12px] text-white/70">Posição</Label>
                                    <Select
                                        value={config.youtube_position}
                                        onValueChange={(value) =>
                                            patch((current) => ({
                                                ...current,
                                                youtube_position: value as CheckoutConfig["youtube_position"],
                                            }))
                                        }
                                    >
                                        <SelectTrigger className={inputClass}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="top">Topo</SelectItem>
                                            <SelectItem value="bottom">Final</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard
                            title="Blocos de conteúdo"
                            description="Imagens e textos exibidos ao lado do formulário"
                        >
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" onClick={() => addBlock("image")} className="rounded-lg border-white/10 bg-white/[0.03]">
                                    <ImageIcon className="mr-2 h-4 w-4" /> Imagem
                                </Button>
                                <Button type="button" variant="outline" onClick={() => addBlock("text")} className="rounded-lg border-white/10 bg-white/[0.03]">
                                    <Type className="mr-2 h-4 w-4" /> Texto
                                </Button>
                            </div>

                            {config.appearance.content_blocks.length === 0 && (
                                <p className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                                    Nenhum bloco adicionado.
                                </p>
                            )}

                            <div className="space-y-4">
                                {config.appearance.content_blocks.map((block, index) => (
                                    <div key={block.id} className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                {block.type === "image" ? `Imagem ${index + 1}` : `Texto ${index + 1}`}
                                            </span>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeBlock(block.id)}>
                                                <Trash2 className="h-4 w-4 text-red-400" />
                                            </Button>
                                        </div>

                                        {block.type === "image" ? (
                                            <>
                                                <Input
                                                    value={block.url}
                                                    onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                                                    placeholder="URL da imagem"
                                                    className={inputClass}
                                                />
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <Select
                                                        value={block.format}
                                                        onValueChange={(value) => updateBlock(block.id, { format: value as any })}
                                                    >
                                                        <SelectTrigger className={inputClass}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {CHECKOUT_IMAGE_FORMATS.map((format) => (
                                                                <SelectItem key={format.id} value={format.id}>
                                                                    {format.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        value={block.placement}
                                                        onValueChange={(value) => updateBlock(block.id, { placement: value as any })}
                                                    >
                                                        <SelectTrigger className={inputClass}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="main">Principal</SelectItem>
                                                            <SelectItem value="sidebar">Lateral</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        value={block.alt}
                                                        onChange={(event) => updateBlock(block.id, { alt: event.target.value })}
                                                        placeholder="Texto alternativo"
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <Input
                                                    value={block.link}
                                                    onChange={(event) => updateBlock(block.id, { link: event.target.value })}
                                                    placeholder="Link ao clicar (opcional)"
                                                    className={inputClass}
                                                />
                                                {block.url && (
                                                    <img
                                                        src={block.url}
                                                        alt={block.alt || "Prévia"}
                                                        className="max-h-48 w-full rounded-lg border border-white/5 object-cover"
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Input
                                                    value={block.title}
                                                    onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                                                    placeholder="Título"
                                                    className={inputClass}
                                                />
                                                <Textarea
                                                    value={block.body}
                                                    onChange={(event) => updateBlock(block.id, { body: event.target.value })}
                                                    placeholder="Texto do bloco"
                                                    className="min-h-24 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
                                                />
                                                <Select
                                                    value={block.align}
                                                    onValueChange={(value) => updateBlock(block.id, { align: value as any })}
                                                >
                                                    <SelectTrigger className={inputClass}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="left">Esquerda</SelectItem>
                                                        <SelectItem value="center">Centro</SelectItem>
                                                        <SelectItem value="right">Direita</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    </TabsContent>

                    {/* CAMPOS */}
                    <TabsContent value="campos" className="space-y-4">
                        <SectionCard title="Campos do cliente" description="Defina o que é pedido no formulário">
                            {[
                                { key: "cpf", label: "CPF / CNPJ", hint: "Alguns gateways exigem o documento." },
                                { key: "phone", label: "Celular", hint: "Necessário para PIX em alguns gateways." },
                                { key: "coupon", label: "Cupom de desconto", hint: "Exibe o campo de cupom no resumo." },
                            ].map((field) => (
                                <div key={field.key} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                                    <div>
                                        <p className="text-[13px] font-medium text-white/80">{field.label}</p>
                                        <p className="text-[11px] text-muted-foreground">{field.hint}</p>
                                    </div>
                                    <Switch
                                        checked={config.customer_fields[field.key as keyof CheckoutConfig["customer_fields"]]}
                                        onCheckedChange={(checked) =>
                                            patch((current) => ({
                                                ...current,
                                                customer_fields: { ...current.customer_fields, [field.key]: checked },
                                            }))
                                        }
                                    />
                                </div>
                            ))}

                            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 opacity-60">
                                <div>
                                    <p className="text-[13px] font-medium text-white/80">Nome e e-mail</p>
                                    <p className="text-[11px] text-muted-foreground">Sempre obrigatórios para emitir o pedido.</p>
                                </div>
                                <Switch checked disabled />
                            </div>
                        </SectionCard>
                    </TabsContent>

                    {/* SOCIAL */}
                    <TabsContent value="social" className="space-y-4">
                        <SectionCard title="Avaliações" description="Depoimentos exibidos na página de checkout">
                            <Button type="button" variant="outline" onClick={addReview} className="rounded-lg border-white/10 bg-white/[0.03]">
                                <Plus className="mr-2 h-4 w-4" /> Adicionar avaliação
                            </Button>

                            {config.reviews.length === 0 && (
                                <p className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                                    Nenhuma avaliação cadastrada.
                                </p>
                            )}

                            <div className="space-y-4">
                                {config.reviews.map((review, index) => (
                                    <div key={index} className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Avaliação {index + 1}
                                            </span>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeReview(index)}>
                                                <Trash2 className="h-4 w-4 text-red-400" />
                                            </Button>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Input
                                                value={review.author}
                                                onChange={(event) => updateReview(index, { author: event.target.value })}
                                                placeholder="Nome do cliente"
                                                className={inputClass}
                                            />
                                            <Input
                                                value={review.photo}
                                                onChange={(event) => updateReview(index, { photo: event.target.value })}
                                                placeholder="Foto (URL)"
                                                className={inputClass}
                                            />
                                        </div>

                                        <Textarea
                                            value={review.description}
                                            onChange={(event) => updateReview(index, { description: event.target.value })}
                                            placeholder="Depoimento"
                                            className="min-h-20 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
                                        />

                                        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] text-white/60">Estrelas</Label>
                                                <Select
                                                    value={String(review.stars)}
                                                    onValueChange={(value) => updateReview(index, { stars: Number(value) })}
                                                >
                                                    <SelectTrigger className={inputClass}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[5, 4, 3, 2, 1].map((star) => (
                                                            <SelectItem key={star} value={String(star)}>
                                                                {star} {star === 1 ? "estrela" : "estrelas"}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center gap-2 text-[12px] text-white/70">
                                                    <Switch
                                                        checked={review.verified_badge}
                                                        onCheckedChange={(checked) => updateReview(index, { verified_badge: checked })}
                                                    />
                                                    Compra verificada
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    </TabsContent>

                    {/* CONTATO */}
                    <TabsContent value="contato" className="space-y-4">
                        <SectionCard title="Botão de suporte" description="Atalho flutuante para WhatsApp ou link">
                            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                                <div>
                                    <p className="text-[13px] font-medium text-white/80">Exibir botão</p>
                                    <p className="text-[11px] text-muted-foreground">Aparece fixo no canto da tela.</p>
                                </div>
                                <Switch
                                    checked={config.support_button.enabled}
                                    onCheckedChange={(checked) =>
                                        patch((current) => ({
                                            ...current,
                                            support_button: { ...current.support_button, enabled: checked },
                                        }))
                                    }
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input
                                    value={config.support_button.text}
                                    onChange={(event) =>
                                        patch((current) => ({
                                            ...current,
                                            support_button: { ...current.support_button, text: event.target.value },
                                        }))
                                    }
                                    placeholder="Fale conosco"
                                    className={inputClass}
                                />
                                <Input
                                    value={config.support_button.url}
                                    onChange={(event) =>
                                        patch((current) => ({
                                            ...current,
                                            support_button: { ...current.support_button, url: event.target.value },
                                        }))
                                    }
                                    placeholder="https://wa.me/55..."
                                    className={inputClass}
                                />
                                <Select
                                    value={config.support_button.icon}
                                    onValueChange={(value) =>
                                        patch((current) => ({
                                            ...current,
                                            support_button: { ...current.support_button, icon: value as any },
                                        }))
                                    }
                                >
                                    <SelectTrigger className={inputClass}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                        <SelectItem value="link">Link</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={config.support_button.position}
                                    onValueChange={(value) =>
                                        patch((current) => ({
                                            ...current,
                                            support_button: { ...current.support_button, position: value as any },
                                        }))
                                    }
                                >
                                    <SelectTrigger className={inputClass}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bottom-right">Direita</SelectItem>
                                        <SelectItem value="bottom-left">Esquerda</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </SectionCard>

                        <SectionCard title="Rodapé" description="Informações de contato e logo no fim da página">
                            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                                <div>
                                    <p className="text-[13px] font-medium text-white/80">Exibir rodapé</p>
                                    <p className="text-[11px] text-muted-foreground">Bloco adicional abaixo do checkout.</p>
                                </div>
                                <Switch
                                    checked={config.footer.enabled}
                                    onCheckedChange={(checked) =>
                                        patch((current) => ({
                                            ...current,
                                            footer: { ...current.footer, enabled: checked },
                                        }))
                                    }
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input
                                    value={config.footer.logo_url}
                                    onChange={(event) =>
                                        patch((current) => ({
                                            ...current,
                                            footer: { ...current.footer, logo_url: event.target.value },
                                        }))
                                    }
                                    placeholder="Logo do rodapé (URL)"
                                    className={inputClass}
                                />
                                <Input
                                    value={config.footer.support_email}
                                    onChange={(event) =>
                                        patch((current) => ({
                                            ...current,
                                            footer: { ...current.footer, support_email: event.target.value },
                                        }))
                                    }
                                    placeholder="suporte@empresa.com"
                                    className={inputClass}
                                />
                            </div>

                            <Textarea
                                value={config.footer.text}
                                onChange={(event) =>
                                    patch((current) => ({
                                        ...current,
                                        footer: { ...current.footer, text: event.target.value },
                                    }))
                                }
                                placeholder="Texto do rodapé"
                                className="min-h-20 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
                            />
                        </SectionCard>
                    </TabsContent>

                    {/* AVANÇADO */}
                    <TabsContent value="avancado" className="space-y-4">
                        <SectionCard title="SEO / compartilhamento" description="Título, descrição e imagem ao compartilhar o link">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input
                                    value={config.seo.title}
                                    onChange={(event) =>
                                        patch((current) => ({
                                            ...current,
                                            seo: { ...current.seo, title: event.target.value },
                                        }))
                                    }
                                    placeholder="Título da página"
                                    className={inputClass}
                                />
                                <Input
                                    value={config.seo.og_image}
                                    onChange={(event) =>
                                        patch((current) => ({
                                            ...current,
                                            seo: { ...current.seo, og_image: event.target.value },
                                        }))
                                    }
                                    placeholder="Imagem de compartilhamento (URL)"
                                    className={inputClass}
                                />
                            </div>
                            <Textarea
                                value={config.seo.description}
                                onChange={(event) =>
                                    patch((current) => ({
                                        ...current,
                                        seo: { ...current.seo, description: event.target.value },
                                    }))
                                }
                                placeholder="Descrição para buscadores e redes sociais"
                                className="min-h-20 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
                            />
                            <div className="space-y-1.5">
                                <Label className="text-[12px] text-white/70">Favicon (URL)</Label>
                                <Input
                                    value={config.seo.favicon}
                                    onChange={(event) =>
                                        patch((current) => ({
                                            ...current,
                                            seo: { ...current.seo, favicon: event.target.value },
                                        }))
                                    }
                                    placeholder="https://.../favicon.png"
                                    className={inputClass}
                                />
                            </div>
                        </SectionCard>

                        <SectionCard title="Ações do checkout" description="Recursos que entram nas próximas fases">
                            <p className="text-sm text-muted-foreground">
                                Timer, notificações de venda, popup de saída, upsell/downsell e pixels serão
                                configurados aqui nas próximas fases — a estrutura de dados já está preparada.
                            </p>
                        </SectionCard>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
