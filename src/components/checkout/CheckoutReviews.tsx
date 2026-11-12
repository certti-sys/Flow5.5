import { Star, BadgeCheck } from "lucide-react";
import type { CheckoutReview } from "@/types/checkout-config";
import { cn } from "@/lib/utils";

interface CheckoutReviewsProps {
    reviews: CheckoutReview[];
    title?: string;
    className?: string;
}

/** Depoimentos/prova social configurados no checkout. */
export function CheckoutReviews({ reviews, title = "Avaliações", className }: CheckoutReviewsProps) {
    const visible = reviews.filter((review) => review.author.trim() || review.description.trim());
    if (visible.length === 0) return null;

    return (
        <section className={cn("space-y-4", className)}>
            <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>

            <div className="grid gap-3 sm:grid-cols-2">
                {visible.map((review, index) => (
                    <article
                        key={`${review.author}-${index}`}
                        className="rounded-xl border bg-card p-4 shadow-sm"
                    >
                        <div className="flex items-start gap-3">
                            {review.photo ? (
                                <img
                                    src={review.photo}
                                    alt={review.author || "Cliente"}
                                    loading="lazy"
                                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-base font-semibold text-muted-foreground">
                                    {(review.author || "C").slice(0, 1).toUpperCase()}
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="truncate text-sm font-semibold text-foreground">
                                        {review.author || "Cliente"}
                                    </span>
                                    {review.verified_badge && (
                                        <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-emerald-600">
                                            <BadgeCheck className="h-3.5 w-3.5" />
                                            Compra verificada
                                        </span>
                                    )}
                                </div>

                                <div
                                    className="mt-1 flex gap-0.5"
                                    aria-label={`Nota: ${review.stars} de 5`}
                                >
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={cn(
                                                "h-3.5 w-3.5",
                                                star <= review.stars
                                                    ? "fill-amber-400 text-amber-400"
                                                    : "text-muted-foreground/30",
                                            )}
                                        />
                                    ))}
                                </div>

                                {review.description && (
                                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                        {review.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {review.testimonial_image && (
                            <img
                                src={review.testimonial_image}
                                alt={`Depoimento de ${review.author || "cliente"}`}
                                loading="lazy"
                                className="mt-3 w-full rounded-lg border object-cover"
                            />
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
}
