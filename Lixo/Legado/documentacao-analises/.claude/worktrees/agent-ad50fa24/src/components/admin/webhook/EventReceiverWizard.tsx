import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Copy, Check, Loader2, ArrowLeft, ArrowRight, Zap, RefreshCw, Package, AlertCircle } from 'lucide-react'

const EVENT_TYPES = [
    { value: 'purchase_approved', label: 'Compra Aprovada', description: 'Concede acesso ao curso', icon: '✅' },
    { value: 'purchase_refunded', label: 'Reembolso', description: 'Remove acesso ao curso', icon: '↩️' },
    { value: 'subscription_active', label: 'Assinatura Ativa', description: 'Concede acesso recorrente', icon: '🔄' },
    { value: 'subscription_cancelled', label: 'Assinatura Cancelada', description: 'Remove acesso', icon: '❌' },
    { value: 'subscription_expired', label: 'Assinatura Expirada', description: 'Remove acesso', icon: '⏰' },
    { value: 'chargeback', label: 'Chargeback', description: 'Remove acesso + flag', icon: '🚫' },
] as const

const INTERNAL_FIELDS = [
    { value: 'customer_email', label: 'Email do Cliente', required: true },
    { value: 'customer_name', label: 'Nome do Cliente', required: false },
    { value: 'external_product_id', label: 'ID do Produto Externo', required: true },
    { value: 'external_transaction_id', label: 'ID da Transação', required: false },
]

interface Platform {
    id: string
    name: string
    display_name: string
}

interface DiscoveredField {
    path: string
    type: string
    example: any
}

interface EventReceiverWizardProps {
    platforms: Platform[]
    onComplete?: () => void
    onCancel?: () => void
}

export function EventReceiverWizard({ platforms, onComplete, onCancel }: EventReceiverWizardProps) {
    const queryClient = useQueryClient()

    // Wizard state
    const [step, setStep] = useState(1)
    const [selectedPlatformId, setSelectedPlatformId] = useState<string>('')
    const [selectedEventType, setSelectedEventType] = useState<string>('')
    const [receiverName, setReceiverName] = useState<string>('')
    const [receiverId, setReceiverId] = useState<string | null>(null)
    const [webhookToken, setWebhookToken] = useState<string>('')
    const [copied, setCopied] = useState(false)
    const [isPolling, setIsPolling] = useState(false)
    const [discoveredFields, setDiscoveredFields] = useState<DiscoveredField[]>([])
    const [fieldMappings, setFieldMappings] = useState<Array<{ source_path: string; internal_field: string }>>([])
    const [useGlobalMappings, setUseGlobalMappings] = useState(true)
    const [fixedCourseId, setFixedCourseId] = useState<string>('')

    // Queries
    const { data: courses } = useQuery({
        queryKey: ['courses-for-receiver'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('courses')
                .select('id, title')
                .order('title')
            if (error) throw error
            return data
        }
    })

    const { data: productMappingsCount } = useQuery({
        queryKey: ['product-mappings-count', selectedPlatformId],
        queryFn: async () => {
            if (!selectedPlatformId) return 0
            const { count } = await supabase
                .from('product_mappings')
                .select('*', { count: 'exact', head: true })
                .eq('platform_id', selectedPlatformId)
                .eq('is_active', true)
            return count || 0
        },
        enabled: !!selectedPlatformId
    })

    // Create receiver mutation
    const createReceiverMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase
                .from('webhook_event_receivers')
                .insert({
                    platform_id: selectedPlatformId,
                    event_type: selectedEventType,
                    name: receiverName.trim() || null,
                    is_active: false // Inativo até configurar
                })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (data) => {
            setReceiverId(data.id)
            setWebhookToken(data.webhook_token)
            toast.success('Receptor criado! Cole a URL na plataforma e envie um teste.')
            setStep(2)
        },
        onError: (error: any) => {
            if (error.code === '23505') {
                toast.error('Já existe um receptor para este evento nesta plataforma.')
            } else {
                toast.error(`Erro ao criar receptor: ${error.message}`)
            }
        }
    })

    // Update receiver mutation
    const updateReceiverMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('webhook_event_receivers')
                .update({
                    field_mappings: fieldMappings,
                    use_global_mappings: useGlobalMappings,
                    fixed_course_id: !useGlobalMappings && fixedCourseId ? fixedCourseId : null,
                    is_active: true
                })
                .eq('id', receiverId)

            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Receptor ativado com sucesso!')
            queryClient.invalidateQueries({ queryKey: ['event-receivers'] })
            onComplete?.()
        },
        onError: (error: any) => {
            toast.error(`Erro ao ativar receptor: ${error.message}`)
        }
    })

    // Poll for sample payload
    useEffect(() => {
        if (!isPolling || !receiverId) return

        const interval = setInterval(async () => {
            const { data } = await supabase
                .from('webhook_event_receivers')
                .select('sample_payload')
                .eq('id', receiverId)
                .single()

            if (data?.sample_payload) {
                setIsPolling(false)
                // Parse discovered fields from sample
                const fields = parseDiscoveredFields(data.sample_payload)
                setDiscoveredFields(fields)
                toast.success('Teste recebido! Selecione os campos a usar.')
            }
        }, 2000)

        return () => clearInterval(interval)
    }, [isPolling, receiverId])

    // Parse discovered fields from payload
    function parseDiscoveredFields(obj: any, prefix = ''): DiscoveredField[] {
        const fields: DiscoveredField[] = []

        if (!obj || typeof obj !== 'object') return fields

        for (const [key, value] of Object.entries(obj)) {
            const path = prefix ? `${prefix}.${key}` : key

            if (value === null) {
                fields.push({ path, type: 'null', example: null })
            } else if (Array.isArray(value)) {
                if (value.length > 0 && typeof value[0] === 'object') {
                    fields.push(...parseDiscoveredFields(value[0], `${path}[0]`))
                } else {
                    fields.push({ path, type: 'array', example: value })
                }
            } else if (typeof value === 'object') {
                fields.push(...parseDiscoveredFields(value, path))
            } else {
                fields.push({ path, type: typeof value, example: value })
            }
        }

        return fields
    }

    // Get webhook URL
    const webhookUrl = webhookToken
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhooks-ingest/${webhookToken}`
        : ''

    // Copy URL
    async function copyUrl() {
        await navigator.clipboard.writeText(webhookUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Toggle field mapping
    function toggleFieldMapping(sourcePath: string, internalField: string) {
        setFieldMappings(prev => {
            const exists = prev.find(m => m.source_path === sourcePath && m.internal_field === internalField)
            if (exists) {
                return prev.filter(m => !(m.source_path === sourcePath && m.internal_field === internalField))
            }
            // Remove any existing mapping for this internal field
            const filtered = prev.filter(m => m.internal_field !== internalField)
            return [...filtered, { source_path: sourcePath, internal_field: internalField }]
        })
    }

    // Get selected platform name
    const selectedPlatform = platforms.find(p => p.id === selectedPlatformId)
    const selectedEvent = EVENT_TYPES.find(e => e.value === selectedEventType)

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-purple-500" />
                            Novo Receptor de Evento
                        </CardTitle>
                        <CardDescription>
                            Estilo Uncanny Automator - URLs por tipo de evento
                        </CardDescription>
                    </div>
                    <Badge variant="outline">
                        Passo {step} de 3
                    </Badge>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-muted rounded-full mt-4">
                    <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Step 1: Selecionar Plataforma e Evento */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Plataforma *</Label>
                            <Select value={selectedPlatformId} onValueChange={setSelectedPlatformId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a plataforma" />
                                </SelectTrigger>
                                <SelectContent>
                                    {platforms.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.display_name || p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Nome do Receptor (opcional)</Label>
                            <Input
                                placeholder="Ex: Hotmart - Curso Python - Compra"
                                value={receiverName}
                                onChange={(e) => setReceiverName(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Nome personalizado para identificar este receptor (ex: produto/gateway/evento)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo de Evento *</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {EVENT_TYPES.map(event => (
                                    <button
                                        key={event.value}
                                        type="button"
                                        onClick={() => setSelectedEventType(event.value)}
                                        className={`p-3 rounded-lg border text-left transition-all ${selectedEventType === event.value
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-white/[0.08] hover:border-muted-foreground/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{event.icon}</span>
                                            <span className="font-medium text-sm">{event.label}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={onCancel}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => createReceiverMutation.mutate()}
                                disabled={!selectedPlatformId || !selectedEventType || createReceiverMutation.isPending}
                            >
                                {createReceiverMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <ArrowRight className="h-4 w-4 mr-2" />
                                )}
                                Criar Receptor
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Copiar URL e Aguardar Teste */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg space-y-3">
                            <Label className="text-sm font-medium">URL do Webhook (única para este evento)</Label>
                            <div className="flex gap-2">
                                <code className="flex-1 p-2 bg-background rounded border text-xs break-all">
                                    {webhookUrl}
                                </code>
                                <Button size="sm" variant="outline" onClick={copyUrl}>
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Cole esta URL na configuração de webhook da {selectedPlatform?.display_name} para o evento "{selectedEvent?.label}".
                            </p>
                        </div>

                        <div className="p-4 border border-dashed rounded-lg text-center space-y-3">
                            {isPolling ? (
                                <>
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
                                    <p className="text-sm">Aguardando teste da plataforma...</p>
                                    <p className="text-xs text-muted-foreground">
                                        Envie um webhook de teste da {selectedPlatform?.display_name}
                                    </p>
                                </>
                            ) : discoveredFields.length > 0 ? (
                                <>
                                    <Check className="h-8 w-8 mx-auto text-green-500" />
                                    <p className="text-sm font-medium text-green-600">
                                        {discoveredFields.length} campos descobertos!
                                    </p>
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground" />
                                    <p className="text-sm">Pronto para receber teste</p>
                                    <Button onClick={() => setIsPolling(true)}>
                                        <Loader2 className="h-4 w-4 mr-2" />
                                        Iniciar Monitoramento
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep(1)}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Voltar
                            </Button>
                            <Button
                                onClick={() => setStep(3)}
                                disabled={discoveredFields.length === 0}
                            >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Configurar Campos
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Configurar Mapeamentos */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <Label className="font-medium">Selecione os campos a mapear</Label>

                            {INTERNAL_FIELDS.map(internalField => {
                                const currentMapping = fieldMappings.find(m => m.internal_field === internalField.value)

                                return (
                                    <div key={internalField.value} className="p-3 border rounded-lg space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                {internalField.label}
                                                {internalField.required && <span className="text-red-500 ml-1">*</span>}
                                            </span>
                                            {currentMapping && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {currentMapping.source_path}
                                                </Badge>
                                            )}
                                        </div>

                                        <Select
                                            value={currentMapping?.source_path || ''}
                                            onValueChange={(value) => {
                                                if (value) {
                                                    toggleFieldMapping(value, internalField.value)
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="text-xs">
                                                <SelectValue placeholder="Selecione um campo do payload" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {discoveredFields
                                                    .filter(f => f.type === 'string' || f.type === 'number')
                                                    .map(field => (
                                                        <SelectItem key={field.path} value={field.path}>
                                                            <div className="flex items-center gap-2">
                                                                <code className="text-xs">{field.path}</code>
                                                                <span className="text-muted-foreground text-xs">
                                                                    ({String(field.example).substring(0, 20)})
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="border-t pt-4 space-y-3">
                            <Label className="font-medium">Configuração de Curso</Label>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="use-global"
                                    checked={useGlobalMappings}
                                    onCheckedChange={(checked) => setUseGlobalMappings(!!checked)}
                                />
                                <Label htmlFor="use-global" className="text-sm cursor-pointer">
                                    Usar mapeamentos de produto (ID → Curso)
                                </Label>
                            </div>

                            {useGlobalMappings && productMappingsCount === 0 && (
                                <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-yellow-600">Nenhum mapeamento encontrado</p>
                                        <p className="text-muted-foreground text-xs">
                                            Configure mapeamentos de produto na aba "Produtos" para esta plataforma.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!useGlobalMappings && (
                                <div className="space-y-2">
                                    <Label className="text-sm">Curso Fixo (para qualquer produto)</Label>
                                    <Select value={fixedCourseId} onValueChange={setFixedCourseId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um curso" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {courses?.map(course => (
                                                <SelectItem key={course.id} value={course.id}>
                                                    {course.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep(2)}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Voltar
                            </Button>
                            <Button
                                onClick={() => updateReceiverMutation.mutate()}
                                disabled={
                                    updateReceiverMutation.isPending ||
                                    !fieldMappings.find(m => m.internal_field === 'customer_email') ||
                                    (!useGlobalMappings && !fixedCourseId)
                                }
                            >
                                {updateReceiverMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Zap className="h-4 w-4 mr-2" />
                                )}
                                Ativar Receptor
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
