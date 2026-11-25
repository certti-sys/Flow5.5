import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ErrorState } from "@/components/ErrorState";
import { PostPurchaseMedia } from "@/components/checkout/PostPurchaseMedia";
import { fillPostPurchaseVars } from "@/lib/post-purchase";
import { initPixels, trackPixel } from "@/lib/pixels";
import {
  DEFAULT_CHECKOUT_CONFIG,
  normalizeCheckoutConfig,
  type CheckoutPostPurchasePage,
  type CheckoutUpsellOffer,
} from "@/types/checkout-config";

/**
 * Páginas públicas de upsell e downsell.
 *
 * O token é o próprio `orderId` (UUID) - sem tabela de tokens, como na
 * referência. O pedido é lido pela RPC pública `get_order_public`, que é a mesma
 * do obrigado; nada aqui exige login.
 *
 * Aceitar não cria pedido cobrado no cliente: leva para o checkout normal do
 * produto com `?parent=<pedido>` e o `payment-ops` grava
 * `metadata.parent_order_id` / `metadata.kind` no pedido novo. Assim existe uma
 * única implementação de cobrança (gateways, PIX, cupom) e ela já é testada.
 */

interface PublicOrder {
  id: string;
  status: string;
  total_amount: number;
  currency: string;
  customer_first_name: string | null;
  items: Array<{ product_id: string | null; name: string; kind: string }>;
  payment: { status: string; method: string | null } | null;
}

interface OfferProduct {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  active: boolean;
}

const formatPrice = (cents: number | null | undefined) =>
  typeof cents === "number" && cents > 0
    ? `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : null;

export default function CheckoutUpsell({ mode }: { mode: "upsell" | "downsell" }) {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [offers, setOffers] = useState<Array<CheckoutUpsellOffer & { product: OfferProduct }>>([]);
  const [hasDownsell, setHasDownsell] = useState(false);
  const [page, setPage] = useState<CheckoutPostPurchasePage>(DEFAULT_CHECKOUT_CONFIG.upsell.page);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoadError("Pedido inválido");
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      const { data, error } = await supabase.rpc("get_order_public", { p_order_id: orderId });
      if (!active) return;
      if (error || !data) {
        setLoadError(error?.message ?? "Pedido não encontrado");
        setLoading(false);
        return;
      }

      const publicOrder = data as PublicOrder;
      setOrder(publicOrder);

      const mainItem = publicOrder.items?.find((item) => item.kind === "main") ?? publicOrder.items?.[0];
      if (!mainItem?.product_id) {
        setLoadError("Pedido sem produto");
        setLoading(false);
        return;
      }

      const { data: product } = await supabase
        .from("products")
        .select("checkout_config")
        .eq("id", mainItem.product_id)
        .maybeSingle();
      if (!active) return;

      const config = normalizeCheckoutConfig(product?.checkout_config);
      const candidates = mode === "upsell"
        ? config.upsell.enabled ? config.upsell.products : []
        : config.upsell.downsell.enabled && config.upsell.downsell.product_id
          ? [config.upsell.downsell]
          : [];

      setPage(mode === "upsell" ? config.upsell.page : config.upsell.downsell.page);
      setHasDownsell(mode === "upsell" && config.upsell.downsell.enabled && !!config.upsell.downsell.product_id);

      if (candidates.length === 0) {
        navigate(`/checkout/obrigado/${orderId}`, { replace: true });
        return;
      }

      const ids = candidates.map((offer) => offer.product_id).filter((id): id is string => !!id);
      const { data: products } = await supabase
        .from("products")
        .select("id, name, price, image_url, active")
        .in("id", ids);
      if (!active) return;

      const byId = new Map((products ?? []).map((item) => [item.id, item as OfferProduct]));
      const resolved = candidates.flatMap((offer) => {
        const product = offer.product_id ? byId.get(offer.product_id) : undefined;
        if (!product || !product.active) return [];
        return [{ ...offer, product }];
      });

      if (resolved.length === 0) {
        navigate(`/checkout/obrigado/${orderId}`, { replace: true });
        return;
      }

      setOffers(resolved);
      setLoading(false);

      void initPixels(mainItem.product_id).then(() => {
        trackPixel({ name: "PageView" });
      });
    })();

    return () => {
      active = false;
    };
  }, [orderId, mode, navigate]);

  const decline = () => {
    if (!orderId) return;
    if (hasDownsell) {
      navigate(`/checkout/downsell/${orderId}`);
      return;
    }
    navigate(`/checkout/obrigado/${orderId}`);
  };

  const accept = async (offer: CheckoutUpsellOffer & { product: OfferProduct }) => {
    if (!orderId || !offer.product_id) return;
    setAccepting(true);
    try {
      const params = new URLSearchParams({ parent: orderId });
      const name = order?.customer_first_name ?? "";
      if (name) params.set("name", name);
      // O e-mail não vai por query (fica no histórico do navegador); o checkout
      // pede de novo e o vínculo com o pedido pai vai no `parent`.
      navigate(`/checkout/${offer.product_id}?${params.toString()}`);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorState
          title="Oferta não disponível"
          description="O link pode estar incorreto ou o pedido ainda não foi aprovado."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const paid = order.status === "paid" || order.payment?.status === "paid";
  if (!paid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Clock className="w-12 h-12 text-yellow-500 mx-auto" />
            <h1 className="text-xl font-bold">Aguardando pagamento</h1>
            <p className="text-sm text-muted-foreground">
              Esta oferta aparece depois que o pagamento do pedido anterior for confirmado.
            </p>
            <Button asChild variant="outline">
              <Link to={`/checkout/obrigado/${order.id}`}>Acompanhar pedido</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vars = {
    nome: order.customer_first_name,
    produto: order.items?.find((item) => item.kind === "main")?.name ?? null,
  };

  const headline = fillPostPurchaseVars(page.headline, vars).trim()
    || (mode === "upsell" ? "Quer levar isso também?" : "Última chance com desconto");
  const subtitle = fillPostPurchaseVars(page.subtitle, vars).trim()
    || (mode === "upsell"
      ? "Uma oferta exclusiva preparada para você"
      : "Uma oferta que não pode ficar de fora");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl shadow-xl border-primary/20">
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">{headline}</h1>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>

          <PostPurchaseMedia page={page} vars={vars} />

          {offers.map((offer) => {
            const title = offer.title_override.trim() || offer.product.name;
            const price = formatPrice(offer.product.price);
            const image = offer.image_url.trim() || offer.product.image_url;

            return (
              <div key={offer.product_id} className="rounded-xl border p-4 space-y-3">
                <div className="flex gap-4">
                  {image && (
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      className="h-20 w-20 shrink-0 rounded-lg border object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold leading-tight">{title}</p>
                    {offer.description.trim() && (
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{offer.description}</p>
                    )}
                    {price && <p className="text-sm font-bold text-primary">{price}</p>}
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={accepting}
                  onClick={() => accept(offer)}
                >
                  {accepting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {mode === "upsell" ? "Sim, quero aproveitar" : "Aceitar oferta"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            );
          })}

          <Separator />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              className="flex-1 text-muted-foreground"
              onClick={decline}
              disabled={accepting}
            >
              Não, obrigado
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to={`/checkout/obrigado/${order.id}`}>Ver meu pedido</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
