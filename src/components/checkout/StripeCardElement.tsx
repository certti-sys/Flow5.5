import { useEffect, useState } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { Loader2, CreditCard, Lock } from 'lucide-react';

interface StripeCardElementProps {
    publicKey: string;
    clientSecret: string;
    amount: number;
    currency: string;
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
}

export function StripeCardElement({
    publicKey,
    clientSecret,
    amount,
    currency,
    onSuccess,
    onError
}: StripeCardElementProps) {
    const [stripe, setStripe] = useState<Stripe | null>(null);
    const [elements, setElements] = useState<StripeElements | null>(null);
    const [processing, setProcessing] = useState(false);
    const [ready, setReady] = useState(false);

    // Carregar Stripe
    useEffect(() => {
        loadStripe(publicKey).then(setStripe);
    }, [publicKey]);

    // Criar elementos Stripe
    useEffect(() => {
        if (!stripe || !clientSecret) return;

        const elements = stripe.elements({
            clientSecret,
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#0066cc',
                    colorBackground: '#ffffff',
                    colorText: '#1f2937',
                    colorDanger: '#ef4444',
                    fontFamily: 'system-ui, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '8px',
                }
            }
        });

        const paymentElement = elements.create('payment', {
            layout: 'tabs'
        });

        paymentElement.mount('#payment-element');

        paymentElement.on('ready', () => {
            setReady(true);
        });

        setElements(elements);

        return () => {
            paymentElement.unmount();
        };
    }, [stripe, clientSecret]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            onError('Stripe não está pronto. Tente novamente.');
            return;
        }

        setProcessing(true);

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/checkout/success`,
                },
                redirect: 'if_required'
            });

            if (error) {
                onError(error.message || 'Erro ao processar pagamento');
            } else if (paymentIntent?.status === 'succeeded') {
                onSuccess(paymentIntent.id);
            } else if (paymentIntent?.status === 'requires_action') {
                // 3D Secure ou outra ação necessária
                onError('Autenticação adicional necessária. Por favor, complete a verificação.');
            } else {
                onError('Pagamento não foi concluído. Status: ' + paymentIntent?.status);
            }
        } catch (err: any) {
            console.error('Stripe error:', err);
            onError(err.message || 'Erro inesperado ao processar pagamento');
        } finally {
            setProcessing(false);
        }
    };

    const formatAmount = (amount: number, currency: string) => {
        const formatter = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency.toUpperCase(),
        });
        return formatter.format(amount / 100);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Pagamento Internacional</h3>
                        <p className="text-sm text-gray-600">Cartão de crédito via Stripe</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-900">
                        {formatAmount(amount, currency)}
                    </p>
                </div>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Stripe Payment Element */}
                <div className="relative">
                    <div
                        id="payment-element"
                        className={`p-4 border rounded-lg transition-opacity ${
                            ready ? 'opacity-100' : 'opacity-50'
                        }`}
                    />

                    {!ready && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Carregando formulário...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Informações de Segurança */}
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <Lock className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-600">
                        <p className="font-medium mb-1">Pagamento 100% seguro</p>
                        <p>
                            Seus dados são criptografados e processados com segurança pela Stripe.
                            Não armazenamos informações do seu cartão.
                        </p>
                    </div>
                </div>

                {/* Botão de Pagamento */}
                <button
                    type="submit"
                    disabled={!stripe || !ready || processing}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Processando pagamento...</span>
                        </>
                    ) : (
                        <>
                            <Lock className="w-5 h-5" />
                            <span>Pagar {formatAmount(amount, currency)}</span>
                        </>
                    )}
                </button>

                {/* Logos de Cartões Aceitos */}
                <div className="flex items-center justify-center gap-3 pt-2">
                    <p className="text-xs text-gray-500">Aceitamos:</p>
                    <div className="flex gap-2">
                        <img src="/images/cards/visa.svg" alt="Visa" className="h-6" />
                        <img src="/images/cards/mastercard.svg" alt="Mastercard" className="h-6" />
                        <img src="/images/cards/amex.svg" alt="American Express" className="h-6" />
                    </div>
                </div>
            </form>

            {/* Informações Adicionais */}
            <div className="text-xs text-gray-500 space-y-1">
                <p>• Pagamento processado em {currency.toUpperCase()}</p>
                <p>• Suporte a 3D Secure para maior segurança</p>
                <p>• Confirmação instantânea por email</p>
            </div>
        </div>
    );
}
