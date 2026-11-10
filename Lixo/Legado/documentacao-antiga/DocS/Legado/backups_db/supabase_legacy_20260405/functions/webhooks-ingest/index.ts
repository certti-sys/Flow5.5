import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-source, x-hotmart-signature, x-kiwify-signature, x-wc-webhook-signature',
}

interface DiscoveredField {
  path: string
  type: string
  example: any
}

// Função para extrair todos os campos de um objeto JSON recursivamente
function discoverFields(obj: any, prefix: string = ''): DiscoveredField[] {
  const fields: DiscoveredField[] = []
  
  if (obj === null || obj === undefined) {
    return fields
  }
  
  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const arrayFields = discoverFields(obj[0], `${prefix}[0]`)
      fields.push(...arrayFields)
    }
    fields.push({
      path: prefix || 'root',
      type: 'array',
      example: `Array[${obj.length}]`
    })
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key
      
      if (value === null) {
        fields.push({ path, type: 'null', example: null })
      } else if (Array.isArray(value)) {
        fields.push({ path, type: 'array', example: `Array[${value.length}]` })
        if (value.length > 0 && typeof value[0] === 'object') {
          const nestedFields = discoverFields(value[0], `${path}[0]`)
          fields.push(...nestedFields)
        }
      } else if (typeof value === 'object') {
        fields.push({ path, type: 'object', example: '{...}' })
        const nestedFields = discoverFields(value, path)
        fields.push(...nestedFields)
      } else {
        const type = typeof value
        let example = value
        if (typeof value === 'string' && value.length > 100) {
          example = value.substring(0, 100) + '...'
        }
        fields.push({ path, type, example })
      }
    }
  }
  
  return fields
}

// Detectar provider baseado em headers e payload
function detectProvider(headers: Record<string, string>, payload: any): { slug: string | null, eventType: string | null } {
  const headerKeys = Object.keys(headers).map(k => k.toLowerCase())
  const userAgent = headers['user-agent'] || ''
  
  // Hotmart
  if (headerKeys.includes('x-hotmart-signature') || headerKeys.includes('x-hotmart-hottok')) {
    const eventType = payload?.event || payload?.data?.product?.name ? 'purchase' : 'unknown'
    return { slug: 'hotmart', eventType: `hotmart.${eventType}` }
  }
  
  // Kiwify
  if (headerKeys.includes('x-kiwify-signature') || payload?.webhook_event_type) {
    const eventType = payload?.webhook_event_type || payload?.order_status || 'unknown'
    return { slug: 'kiwify', eventType: `kiwify.${eventType}` }
  }
  
  // WooCommerce - por headers específicos
  if (headerKeys.includes('x-wc-webhook-signature') || headerKeys.includes('x-wc-webhook-source')) {
    const topic = headers['x-wc-webhook-topic'] || headers['X-WC-Webhook-Topic'] || 'unknown'
    return { slug: 'woocommerce', eventType: `woocommerce.${topic}` }
  }
  
  // WordPress/WooCommerce - detectar por user-agent
  if (userAgent.toLowerCase().includes('wordpress')) {
    const eventType = payload?.event || payload?.action || 'purchase'
    return { slug: 'woocommerce', eventType: eventType }
  }
  
  // Monetizze
  if (payload?.chave_unica || payload?.produto?.codigo) {
    const eventType = payload?.tipoPostback?.codigo || payload?.status || 'unknown'
    return { slug: 'monetizze', eventType: `monetizze.${eventType}` }
  }
  
  // Eduzz
  if (payload?.eduzz_webhook || payload?.trans?.recurrence_code) {
    const eventType = payload?.trans?.status || 'unknown'
    return { slug: 'eduzz', eventType: `eduzz.${eventType}` }
  }
  
  // Verificar header customizado
  const webhookSource = headers['x-webhook-source'] || headers['X-Webhook-Source']
  if (webhookSource) {
    return { slug: webhookSource.toLowerCase(), eventType: `${webhookSource.toLowerCase()}.unknown` }
  }
  
  // Tentar detectar por campos comuns - sempre retornar evento
  if (payload?.event) {
    return { slug: 'generic', eventType: payload.event }
  }
  if (payload?.type) {
    return { slug: 'generic', eventType: payload.type }
  }
  
  // Fallback: usar "generic" para webhooks não identificados
  return { slug: 'generic', eventType: 'unknown' }
}

// Extrair valor de um path no objeto (ex: "buyer.email" -> obj.buyer.email)
function getValueByPath(obj: any, path: string): any {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  let current = obj
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  
  return current
}

// Extrair email com múltiplos caminhos conhecidos
function extractEmail(payload: any): string {
  const emailPaths = [
    'data.client.email',
    'data.customer.email',
    'buyer.email',
    'customer.email',
    'client.email',
    'email',
    'billing.email',
    'billing_email',
    'user.email',
    'data.buyer.email',
    'data.email',
    'purchaser.email',
    'payer.email',
    'subscriber.email'
  ]
  
  for (const path of emailPaths) {
    const value = getValueByPath(payload, path)
    if (value && typeof value === 'string' && value.includes('@')) {
      return value
    }
  }
  
  return 'unknown@webhook.com'
}

// Extrair nome com múltiplos caminhos conhecidos
function extractName(payload: any): string | null {
  const namePaths = [
    'data.client.full_name',
    'data.client.name',
    'data.customer.name',
    'buyer.name',
    'customer.name',
    'client.name',
    'name',
    'full_name',
    'billing.first_name',
    'billing_first_name',
    'user.name',
    'data.buyer.name',
    'data.name',
    'purchaser.name',
    'payer.name',
    'subscriber.name'
  ]
  
  for (const path of namePaths) {
    const value = getValueByPath(payload, path)
    if (value && typeof value === 'string' && value.trim()) {
      return value
    }
  }
  
  return null
}

// Extrair telefone/WhatsApp com múltiplos caminhos conhecidos
function extractPhone(payload: any): string | null {
  const phonePaths = [
    'data.client.phone',
    'data.client.cellphone',
    'data.customer.phone',
    'data.customer.cellphone',
    'buyer.phone',
    'buyer.cellphone',
    'customer.phone',
    'customer.cellphone',
    'client.phone',
    'client.cellphone',
    'phone',
    'cellphone',
    'mobile',
    'whatsapp',
    'billing.phone',
    'billing_phone',
    'user.phone',
    'data.buyer.phone',
    'data.phone',
    'purchaser.phone',
    'payer.phone',
    'subscriber.phone'
  ]
  
  for (const path of phonePaths) {
    const value = getValueByPath(payload, path)
    if (value && typeof value === 'string' && value.trim()) {
      return normalizePhone(value)
    }
  }
  
  return null
}

// Normalizar número de telefone
function normalizePhone(phone: string): string {
  // Remover caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '')
  
  // Se começar com 55 e tiver mais de 10 dígitos, já é BR
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return '+' + cleaned
  }
  
  // Se tiver 10-11 dígitos (BR sem código país), adicionar +55
  if (cleaned.length >= 10 && cleaned.length <= 11) {
    return '+55' + cleaned
  }
  
  // Retornar como está se não conseguir normalizar
  return phone
}

// Extrair transaction ID com múltiplos caminhos
function extractTransactionId(payload: any): string {
  const transactionPaths = [
    'data.transaction.id',
    'transaction.id',
    'transaction',
    'order_id',
    'order.id',
    'id',
    'purchase.transaction',
    'data.purchase.transaction',
    'trans.code',
    'sale.id'
  ]
  
  for (const path of transactionPaths) {
    const value = getValueByPath(payload, path)
    if (value) {
      return String(value)
    }
  }
  
  return crypto.randomUUID()
}

// Gerar senha aleatória
function generateTemporaryPassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Normalizar event type para valores mais limpos
function normalizeEventType(eventType: string | null): string {
  if (!eventType) return 'unknown'
  
  const eventTypeLower = eventType.toLowerCase().replace(/[.-]/g, '_')
  
  const eventMap: Record<string, string> = {
    'approved_purchase': 'purchase',
    'purchase_approved': 'purchase',
    'order_paid': 'purchase',
    'order_completed': 'purchase',
    'order_processing': 'purchase_pending',
    'payment_approved': 'purchase',
    'payment_confirmed': 'purchase',
    'woocommerce_order_completed': 'purchase',
    'woocommerce_order_processing': 'purchase_pending',
    'hotmart_purchase': 'purchase',
    'hotmart_purchase_approved': 'purchase',
    'kiwify_order_paid': 'purchase',
    'refunded': 'refund',
    'refund': 'refund',
    'order_refunded': 'refund',
    'payment_refunded': 'refund',
    'chargeback': 'refund',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'subscription_canceled': 'cancelled',
    'subscription_cancelled': 'cancelled',
    'pending': 'pending',
    'waiting_payment': 'pending',
    'order_pending': 'pending',
  }
  
  return eventMap[eventTypeLower] || eventType
}

// Normalizar status usando platform_status_mappings
async function normalizeStatus(
  supabase: any, 
  platformId: string | null, 
  externalStatus: string
): Promise<string> {
  if (platformId) {
    const { data: mapping } = await supabase
      .from('platform_status_mappings')
      .select('internal_status')
      .eq('platform_id', platformId)
      .eq('external_value', externalStatus.toLowerCase())
      .single()
    
    if (mapping) {
      return mapping.internal_status
    }
  }
  
  // Fallback: tentar mapear por convenção
  const statusLower = externalStatus.toLowerCase()
  if (['paid', 'approved', 'completed', 'complete', 'success', 'active'].includes(statusLower)) {
    return 'approved'
  }
  if (['refunded', 'refund', 'chargeback'].includes(statusLower)) {
    return 'refunded'
  }
  if (['cancelled', 'canceled', 'expired', 'inactive'].includes(statusLower)) {
    return 'cancelled'
  }
  if (['pending', 'waiting', 'processing'].includes(statusLower)) {
    return 'pending'
  }
  
  return statusLower
}

// Buscar ou criar plataforma "generic"
async function getOrCreateGenericPlatform(supabase: any): Promise<string> {
  const { data: existing } = await supabase
    .from('webhook_platforms')
    .select('id')
    .eq('name', 'generic')
    .single()
  
  if (existing) {
    return existing.id
  }
  
  const { data: created, error } = await supabase
    .from('webhook_platforms')
    .insert({
      name: 'generic',
      display_name: 'Genérico / Não Identificado',
      is_active: true
    })
    .select('id')
    .single()
  
  if (error) {
    console.error('Error creating generic platform:', error)
    throw error
  }
  
  return created.id
}

// Processar webhook automaticamente
async function processWebhookAutomatically(
  supabase: any,
  transactionId: string,
  platformId: string,
  internalData: Record<string, any>,
  normalizedStatus: string
): Promise<{ success: boolean; actions: string[]; error?: string }> {
  const actions: string[] = []
  
  try {
    const userEmail = internalData.user_email
    const userName = internalData.user_name || 'Usuário'
    const userPhone = internalData.user_phone
    const productId = internalData.product_id
    
    if (!userEmail) {
      return { success: false, actions, error: 'Email do usuário não encontrado nos dados' }
    }
    
    console.log(`Processing webhook: status=${normalizedStatus}, email=${userEmail}, phone=${userPhone}, product=${productId}`)
    
    let courseId: string | null = null
    let category: string | null = null
    let grantType: string = 'course'
    
    if (productId) {
      const { data: productMapping } = await supabase
        .from('product_mappings')
        .select('course_id, category, grant_type')
        .eq('platform_id', platformId)
        .eq('external_product_id', String(productId))
        .eq('is_active', true)
        .single()
      
      if (productMapping) {
        courseId = productMapping.course_id
        category = productMapping.category
        grantType = productMapping.grant_type
        actions.push(`Produto mapeado: ${grantType === 'course' ? 'Curso' : 'Categoria'}`)
      } else {
        actions.push(`Produto ${productId} não mapeado - ignorando acesso`)
      }
    }
    
    if (normalizedStatus === 'approved') {
      const { data: existingUser } = await supabase.auth.admin.listUsers()
      const user = existingUser?.users?.find((u: any) => u.email?.toLowerCase() === userEmail.toLowerCase())
      
      let userId: string
      let tempPassword: string | null = null
      
      if (user) {
        userId = user.id
        actions.push(`Usuário existente: ${userEmail}`)
      } else {
        tempPassword = generateTemporaryPassword()
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: userEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name: userName }
        })
        
        if (createError) {
          return { success: false, actions, error: `Erro ao criar usuário: ${createError.message}` }
        }
        
        userId = newUser.user.id
        actions.push(`Usuário criado: ${userEmail} (senha temporária: ${tempPassword})`)
      }
      
      // Atualizar WhatsApp no perfil se disponível
      if (userPhone) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ whatsapp: userPhone })
          .eq('id', userId)
        
        if (profileError) {
          console.error('Error updating profile whatsapp:', profileError)
        } else {
          actions.push(`WhatsApp atualizado: ${userPhone}`)
        }
      }
      
      if (grantType === 'course' && courseId) {
        const { data: existingAccess } = await supabase
          .from('user_course_access')
          .select('id')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .single()
        
        if (!existingAccess) {
          await supabase
            .from('user_course_access')
            .insert({
              user_id: userId,
              course_id: courseId,
              granted_by: null
            })
          
          const { data: course } = await supabase
            .from('courses')
            .select('title')
            .eq('id', courseId)
            .single()
          
          actions.push(`Acesso concedido ao curso: ${course?.title || courseId}`)
        } else {
          actions.push(`Usuário já possui acesso ao curso`)
        }
      } else if (grantType === 'category' && category) {
        const { data: existingCategoryAccess } = await supabase
          .from('user_course_categories')
          .select('id')
          .eq('user_id', userId)
          .eq('category', category)
          .single()
        
        if (!existingCategoryAccess) {
          await supabase
            .from('user_course_categories')
            .insert({
              user_id: userId,
              category: category
            })
          
          actions.push(`Acesso concedido à categoria: ${category}`)
        } else {
          actions.push(`Usuário já possui acesso à categoria`)
        }
      }
      
      await supabase
        .from('webhook_transactions')
        .update({ user_id: userId, course_id: courseId })
        .eq('id', transactionId)
      
    } else if (normalizedStatus === 'refunded' || normalizedStatus === 'cancelled') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail.toLowerCase())
        .single()
      
      if (profile) {
        const userId = profile.id
        
        if (grantType === 'course' && courseId) {
          await supabase
            .from('user_course_access')
            .delete()
            .eq('user_id', userId)
            .eq('course_id', courseId)
          
          actions.push(`Acesso removido do curso`)
        } else if (grantType === 'category' && category) {
          await supabase
            .from('user_course_categories')
            .delete()
            .eq('user_id', userId)
            .eq('category', category)
          
          actions.push(`Acesso removido da categoria: ${category}`)
        }
        
        await supabase
          .from('webhook_transactions')
          .update({ user_id: userId })
          .eq('id', transactionId)
      } else {
        actions.push(`Usuário ${userEmail} não encontrado para remoção de acesso`)
      }
    } else {
      actions.push(`Status "${normalizedStatus}" não requer ação automática`)
    }
    
    return { success: true, actions }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, actions, error: errorMessage }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })
    
    let payload: any
    const contentType = headers['content-type'] || ''
    
    if (contentType.includes('application/json')) {
      payload = await req.json()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      payload = Object.fromEntries(formData.entries())
    } else {
      const text = await req.text()
      try {
        payload = JSON.parse(text)
      } catch {
        payload = { raw_text: text }
      }
    }

    console.log('Webhook received:', JSON.stringify(payload).substring(0, 500))
    console.log('Headers:', JSON.stringify(headers))

    // Detectar provider e event type
    const { slug: detectedSlug, eventType: rawEventType } = detectProvider(headers, payload)
    const detectedEventType = normalizeEventType(rawEventType)
    console.log(`Detected provider: ${detectedSlug}, raw event: ${rawEventType}, normalized: ${detectedEventType}`)

    // Buscar ou criar plataforma
    let platformId: string | null = null
    
    if (detectedSlug) {
      const { data: platform } = await supabase
        .from('webhook_platforms')
        .select('id')
        .eq('name', detectedSlug)
        .single()
      
      if (platform) {
        platformId = platform.id
      } else {
        // Criar plataforma automaticamente se não existir
        platformId = await getOrCreateGenericPlatform(supabase)
        console.log(`Using generic platform: ${platformId}`)
      }
    } else {
      // Usar plataforma genérica para webhooks não identificados
      platformId = await getOrCreateGenericPlatform(supabase)
      console.log(`Created/using generic platform: ${platformId}`)
    }

    // Extrair dados melhorados
    const customerEmail = extractEmail(payload)
    const customerName = extractName(payload)
    const customerPhone = extractPhone(payload)
    const transactionId = extractTransactionId(payload)
    
    console.log(`Extracted: email=${customerEmail}, name=${customerName}, phone=${customerPhone}`)

    // Salvar evento bruto
    const { data: webhookEvent, error: eventError } = await supabase
      .from('webhook_transactions')
      .insert({
        platform_id: platformId,
        raw_payload: payload,
        event_type: detectedEventType || 'unknown',
        status: 'received',
        customer_email: customerEmail,
        customer_name: customerName,
        external_transaction_id: transactionId
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error saving webhook event:', eventError)
      throw eventError
    }

    console.log('Webhook event saved:', webhookEvent.id)

    // Auto Discovery: descobrir campos do payload
    const discoveredFields = discoverFields(payload)
    console.log(`Discovered ${discoveredFields.length} fields`)

    // SEMPRE salvar schema (mesmo para plataforma genérica)
    if (platformId && detectedEventType) {
      const { data: existingSchema } = await supabase
        .from('webhook_schemas')
        .select('id, fields_json')
        .eq('platform_id', platformId)
        .eq('event_type', detectedEventType)
        .single()

      if (!existingSchema) {
        const { error: schemaError } = await supabase
          .from('webhook_schemas')
          .insert({
            platform_id: platformId,
            event_type: detectedEventType,
            fields_json: discoveredFields,
            sample_payload: payload,
            sample_event_id: webhookEvent.id,
            is_learned: false
          })

        if (schemaError) {
          console.error('Error creating schema:', schemaError)
        } else {
          console.log('New schema created for:', detectedEventType)
        }
      } else {
        const existingPaths = new Set((existingSchema.fields_json as DiscoveredField[]).map(f => f.path))
        const newFields = discoveredFields.filter(f => !existingPaths.has(f.path))
        
        if (newFields.length > 0) {
          const updatedFields = [...(existingSchema.fields_json as DiscoveredField[]), ...newFields]
          await supabase
            .from('webhook_schemas')
            .update({ 
              fields_json: updatedFields,
              sample_payload: payload,
              sample_event_id: webhookEvent.id
            })
            .eq('id', existingSchema.id)
          
          console.log(`Added ${newFields.length} new fields to existing schema`)
        }
      }
    }

    // Processar com mappings existentes
    let processingResult: any = { status: 'no_mappings' }
    
    if (platformId) {
      const { data: mappings } = await supabase
        .from('webhook_field_mappings')
        .select('*')
        .eq('platform_id', platformId)
        .or(`event_type.is.null,event_type.eq.${detectedEventType}`)

      if (mappings && mappings.length > 0) {
        const internalData: Record<string, any> = {}
        
        for (const mapping of mappings) {
          const value = getValueByPath(payload, mapping.source_path)
          if (value !== undefined) {
            internalData[mapping.internal_field] = value
          }
        }
        
        // Se não houver mapeamento de telefone, usar extração automática
        if (!internalData.user_phone && customerPhone) {
          internalData.user_phone = customerPhone
        }

        console.log('Internal data extracted:', JSON.stringify(internalData))

        const rawStatus = internalData.event_status || 
                         getValueByPath(payload, 'status') || 
                         getValueByPath(payload, 'data.transaction.status') ||
                         getValueByPath(payload, 'payment_status') ||
                         'unknown'
        const normalizedStatus = await normalizeStatus(supabase, platformId, String(rawStatus))
        console.log(`Status normalized: ${rawStatus} -> ${normalizedStatus}`)

        const processResult = await processWebhookAutomatically(
          supabase,
          webhookEvent.id,
          platformId,
          internalData,
          normalizedStatus
        )

        processingResult = {
          internalData,
          mappingsUsed: mappings.length,
          rawStatus,
          normalizedStatus,
          autoProcess: processResult
        }

        await supabase
          .from('webhook_transactions')
          .update({
            status: processResult.success ? 'completed' : 'error',
            processing_result: processingResult,
            processed_at: new Date().toISOString(),
            customer_email: internalData.user_email || webhookEvent.customer_email,
            customer_name: internalData.user_name || webhookEvent.customer_name,
            external_product_id: internalData.product_id || null,
            error_message: processResult.error || null
          })
          .eq('id', webhookEvent.id)

        console.log('Auto-processing result:', JSON.stringify(processResult))
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id: webhookEvent.id,
        detected_provider: detectedSlug,
        detected_event_type: detectedEventType,
        fields_discovered: discoveredFields.length,
        processing_result: processingResult
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Webhook ingestion error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
