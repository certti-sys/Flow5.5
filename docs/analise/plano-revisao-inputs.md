# PLANO DE REVISÃO COMPLETA DE INPUTS — Flow5.5

## Objetivo
Verificar que TODOS os formulários, botões de cadastro, alteração, exclusão e inputs do sistema estão funcionando corretamente, com validação adequada, tratamento de erro e feedback ao usuário.

## Domínios a Revisar (8 áreas)

### 1. Autenticação (Auth)
- `src/pages/Login.tsx` — Login e cadastro (signup)
- `src/components/ChangePasswordModal.tsx` — Alterar senha
- `src/components/admin/ResetPasswordModal.tsx` — Reset de senha admin

### 2. Cursos e Conteúdo
- `src/components/admin/CourseFormModal.tsx` — Criar/editar curso
- `src/components/admin/LessonFormModal.tsx` — Criar/editar aula
- `src/components/admin/ModuleFormModal.tsx` — Criar/editar módulo
- `src/components/admin/CreateCarouselModal.tsx` — Criar/editar carrossel
- `src/components/admin/DraggableCourseSelector.tsx` — Seleção de cursos

### 3. Alunos e Perfis
- `src/components/admin/CreateStudentModal.tsx` — Criar aluno
- `src/components/admin/EditStudentModal.tsx` — Editar aluno
- `src/components/admin/SuspendStudentModal.tsx` — Suspender/reativar
- `src/components/EditProfileModal.tsx` — Editar perfil próprio
- `src/components/admin/AssignCoursesModal.tsx` — Atribuir cursos ao aluno

### 4. Comercial (Checkout, Pagamentos, Cupons)
- `src/pages/checkout/Checkout.tsx` — Checkout completo
- `src/components/checkout/CustomerForm.tsx` — Dados do cliente
- `src/components/checkout/CustomCardForm.tsx` — Formulário de cartão
- `src/components/checkout/PaymentMethods.tsx` — Métodos de pagamento
- `src/components/admin/ProductFormModal.tsx` — Criar/editar produto
- `src/features/coupons/components/AdminCouponFormDialog.tsx` — Criar/editar cupom
- `src/components/admin/OrderBumps.tsx` — Order bumps

### 5. Administração da Plataforma
- `src/components/admin/ThemeCustomization.tsx` — Personalização de tema
- `src/components/admin/BrandingCustomization.tsx` — Branding
- `src/components/admin/LayoutCustomization.tsx` — Layout
- `src/components/admin/CategoryManagerModal.tsx` — Gerenciar categorias
- `src/components/admin/EmailSettings.tsx` — Configurações de email
- `src/components/admin/WhatsAppSettings.tsx` — Configurações WhatsApp
- `src/components/admin/Gateways.tsx` — Gateways de pagamento
- `src/components/admin/GatewayConfigModal.tsx` — Configurar gateway
- `src/components/admin/Notifications.tsx` — Notificações
- `src/components/admin/Comments.tsx` — Comentários
- `src/pages/admin/CertificatesDashboard.tsx` — Certificados

### 6. Webhooks e Integrações
- `src/pages/admin/WebhookHub.tsx` — Hub de webhooks
- `src/components/admin/webhook/ConfigureMappingsWizard.tsx` — Wizard de mapeamento
- `src/components/admin/webhook/EventReceiverWizard.tsx` — Receptor de eventos
- `src/components/admin/webhook/FieldMappingEditor.tsx` — Editor de mapeamento de campos
- `src/components/admin/webhook/PlatformConfigModal.tsx` — Config platform
- `src/components/admin/webhook/ProductMappingsEditor.tsx` — Mapeamento produtos
- `src/components/admin/webhook/StatusMappingsEditor.tsx` — Mapeamento status
- `src/components/admin/webhook/WebhookSchemaViewer.tsx` — Visualizar schema

## Checklist por Formulário
Para cada input/botão, verificar:
1. ✅ Validação Zod funciona (campos obrigatórios, tipos, formatos)
2. ✅ Envio de dados para o banco (Sucess)
3. ✅ Tratamento de erro (400, 401, 403, 500) com toast amigável
4. ✅ Loading state durante envio
5. ✅ Feedback de sucesso (toast)
6. ✅ Reset/limpeza do formulário após sucesso
7. ✅ RLS permite a operação (não retorna 403)
8. ✅ Edge Function responde corretamente (quando aplica)

## Prioridade
- **P0**: Login, Cadastro, Criar Curso, Criar Aluno, Checkout, Criar Cupom
- **P1**: Editar Curso, Editar Aluno, Editar Perfil, Alterar Senha, Suspender Aluno
- **P2**: Webhooks, Gateways, Notificações, Certificados, Carrossel
- **P3**: Tema, Branding, Layout, Categorias
