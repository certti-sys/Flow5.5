import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Copy, Check, Trash2, Zap, Plus, RefreshCw, ExternalLink } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    purchase_approved: { label: 'Compra Aprovada', icon: '✅', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
    purchase_refunded: { label: 'Reembolso', icon: '↩️', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
    subscription_active: { label: 'Assinatura Ativa', icon: '🔄', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
    subscription_cancelled: { label: 'Assinatura Cancelada', icon: '❌', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
    subscription_expired: { label: 'Assinatura Expirada', icon: '⏰', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
    chargeback: { label: 'Chargeback', icon: '🚫', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
}

interface EventReceiver {
    id: string
    platform_id: string
    event_type: string
    webhook_token: string
    is_active: boolean
    field_mappings: any[]
    sample_payload: any
    use_global_mappings: boolean
    fixed_course_id: string | null
    name: string | null
    created_at: string
    webhook_platforms: {
        id: string
        name: string
        display_name: string
    }
    courses?: {
        id: string
        title: string
    } | null
}

interface EventReceiversListProps {
    onCreateNew: () => void
}

export function EventReceiversList({ onCreateNew }: EventReceiversListProps) {
    const queryClient = useQueryClient()
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Fetch receivers
    const { data: receivers, isLoading } = useQuery({
        queryKey: ['event-receivers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('webhook_event_receivers')
                .select(`
          *,
          webhook_platforms (id, name, display_name),
          courses (id, title)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as EventReceiver[]
        }
    })

    // Toggle active mutation
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase
                .from('webhook_event_receivers')
                .update({ is_active })
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-receivers'] })
        },
        onError: (error: any) => {
            toast.error(`Erro ao atualizar: ${error.message}`)
        }
    })

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('webhook_event_receivers')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Receptor removido')
            queryClient.invalidateQueries({ queryKey: ['event-receivers'] })
        },
        onError: (error: any) => {
            toast.error(`Erro ao remover: ${error.message}`)
        }
    })

    // Copy URL
    async function copyUrl(token: string, id: string) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhooks-ingest/${token}`
        await navigator.clipboard.writeText(url)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
        toast.success('URL copiada!')
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Zap className="h-5 w-5 text-purple-500" />
                        Receptores de Evento
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        URLs dedicadas por tipo de evento (estilo Uncanny Automator)
                    </p>
                </div>
                <Button onClick={onCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Receptor
                </Button>
            </div>

            {!receivers || receivers.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">Nenhum receptor configurado</p>
                        <Button onClick={onCreateNew}>
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Primeiro Receptor
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3">
                    {receivers.map((receiver) => {
                        const eventConfig = EVENT_TYPE_LABELS[receiver.event_type] || {
                            label: receiver.event_type,
                            icon: '📥',
                            color: 'bg-muted'
                        }

                        return (
                            <Card key={receiver.id} className={`transition-all ${!receiver.is_active ? 'opacity-60' : ''}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1">
                                                {receiver.name && (
                                                    <span className="font-medium text-sm">
                                                        {receiver.name}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-normal">
                                                        {receiver.webhook_platforms?.display_name || receiver.webhook_platforms?.name}
                                                    </Badge>
                                                    <Badge className={`${eventConfig.color} border`}>
                                                        <span className="mr-1">{eventConfig.icon}</span>
                                                        {eventConfig.label}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <code className="bg-muted px-1 rounded">
                                                        ...{receiver.webhook_token.slice(-8)}
                                                    </code>
                                                    <span>•</span>
                                                    <span>
                                                        {receiver.field_mappings?.length || 0} campos mapeados
                                                    </span>
                                                    {receiver.use_global_mappings ? (
                                                        <span className="text-blue-500">• Usa mapeamentos globais</span>
                                                    ) : receiver.courses ? (
                                                        <span className="text-purple-500">• Curso fixo: {receiver.courses.title}</span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => copyUrl(receiver.webhook_token, receiver.id)}
                                            >
                                                {copiedId === receiver.id ? (
                                                    <Check className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>

                                            <Switch
                                                checked={receiver.is_active}
                                                onCheckedChange={(checked) =>
                                                    toggleActiveMutation.mutate({ id: receiver.id, is_active: checked })
                                                }
                                            />

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                                                                <Trash2 className="h-5 w-5 text-red-500" />
                                                            </div>
                                                            <div>
                                                                <AlertDialogTitle className="tracking-tight">Remover Receptor</AlertDialogTitle>
                                                                <AlertDialogDescription className="mt-1">
                                                                    Isso desativará permanentemente esta URL de webhook. Webhooks enviados para esta URL não serão mais processados.
                                                                </AlertDialogDescription>
                                                            </div>
                                                        </div>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="mt-4 pt-4 border-t border-white/5">
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => deleteMutation.mutate(receiver.id)}
                                                            className="bg-red-500 hover:bg-red-600 text-white border-0"
                                                        >
                                                            Remover
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
