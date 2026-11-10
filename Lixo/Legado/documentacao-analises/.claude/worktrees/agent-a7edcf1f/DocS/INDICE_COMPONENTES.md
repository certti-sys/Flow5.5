# Índice de Componentes - Neo Vidya Stream

**Quick Reference** para localizar componentes e entender sua função.

---

## 1. COMPONENTES ESTRUTURAIS

### Layouts
```
ClientLayout.tsx              → Layout padrão para alunos
AdminLayout.tsx               → Layout protegido para admins
CheckoutLayout.tsx            → Layout seguro para checkout
```

### Navegação Principal
```
Navbar.tsx                    → Barra de navegação superior sticky
ClientSidebar.tsx             → Sidebar lateral (colapsável)
AdminSidebar.tsx              → Sidebar admin com menus
ContentHeader.tsx             → Header com breadcrumbs (sidebar mode)
```

### Barra Lateral - Componentes
```
NavLink.tsx                   → Link com estado ativo
SearchBar.tsx                 → Search input com modal
NotificationBell.tsx          → Ícone notificações com dropdown
```

---

## 2. COMPONENTES DE CONTEÚDO

### Hero & Banners
```
HeroBanner.tsx                → Seção hero da dashboard
```

### Cards & Carousels
```
CourseCard.tsx                → Card individual de curso
DynamicCarousel.tsx           → Carrossel configurável
CarouselIndicators.tsx        → Dots de paginação
```

### Players
```
UniversalVideoPlayer.tsx      → Player HLS + YouTube
VideoPlayer.tsx               → HLS player nativo
YouTubePlayer.tsx             → YouTube embed
```

### Aula
```
LessonSidebar.tsx             → Sidebar da aula (módulo/lições)
LessonMaterials.tsx           → Seção de materiais da aula
```

### Perfil
```
ProfileHero.tsx               → Seção hero do perfil
CoursesInProgress.tsx         → Grid de cursos em progresso
```

---

## 3. COMPONENTES DE FORMULÁRIO

### Checkout Forms
```
CustomerForm.tsx              → Dados de cliente (nome, email, CPF, phone)
PaymentMethods.tsx            → Seleção de método (cartão, pix, boleto)
CustomCardForm.tsx            → Formulário de dados do cartão
OrderBumpCard.tsx             → Card de add-on product
OrderSummary.tsx              → Resumo de pedido e preços
```

---

## 4. COMPONENTES ADMIN - DASHBOARD

### Stats & Charts
```
StatsOverview.tsx             → 4 cards de estatísticas principais
ActivityChart.tsx             → Gráfico de atividade (7 dias)
CourseDistributionChart.tsx   → Gráfico pie de distribuição cursos
SalesMetrics.tsx              → Métricas de vendas
EngagementCard.tsx            → Card de engajamento
ContentCard.tsx               → Card de conteúdo criado
WebhookStats.tsx              → Estatísticas de webhooks
```

### Tables & Lists
```
CoursesMetricsTable.tsx       → Tabela de cursos com métricas
RecentStudents.tsx            → Lista de alunos recentes
RecentComments.tsx            → Lista de comentários recentes
ActivityTimeline.tsx          → Timeline de atividades
```

---

## 5. COMPONENTES ADMIN - MODAIS

### CRUD Modals
```
CourseFormModal.tsx           → Criar/editar curso
CreateStudentModal.tsx        → Criar novo aluno
CreateCarouselModal.tsx       → Criar novo carrossel
CategoryManagerModal.tsx      → Gerenciar categorias
AssignCoursesModal.tsx        → Assignar cursos a aluno
```

### User Modals
```
EditProfileModal.tsx          → Editar perfil do usuário
ChangePasswordModal.tsx       → Mudar senha
```

---

## 6. COMPONENTES SHADCN/UI

### Input Components
```
Button.tsx                    → Botões
Input.tsx                     → Campos de texto
Label.tsx                     → Labels para formulários
Textarea.tsx                  → Campos multi-linha
Select.tsx                    → Dropdowns
Checkbox.tsx                  → Checkboxes
Radio.tsx                     → Radio buttons
Toggle.tsx                    → Toggle switches
Slider.tsx                    → Sliders de range
InputOTP.tsx                  → Input para OTP
```

### Containers
```
Card.tsx                      → Container com bordas
Tabs.tsx                      → Tab navigation
Accordion.tsx                 → Expandable sections
Collapsible.tsx               → Collapsible content
ScrollArea.tsx                → Scrollable container
AspectRatio.tsx               → Fixed aspect ratio
Resizable.tsx                 → Redimensionável
```

### Navigation
```
Sidebar.tsx                   → Sidebar com provider
Breadcrumb.tsx                → Breadcrumb navigation
Pagination.tsx                → Page navigation
Menubar.tsx                   → Menu bar
NavigationMenu.tsx            → Navigation menu
```

### Dialogs
```
Dialog.tsx                    → Modal dialog
AlertDialog.tsx               → Alert confirmation
Sheet.tsx                     → Side drawer
Popover.tsx                   → Floating popover
```

### Dropdown
```
DropdownMenu.tsx              → Dropdown menu
ContextMenu.tsx               → Right-click context menu
```

### Data Display
```
Table.tsx                     → Data table
Avatar.tsx                    → User avatars
Badge.tsx                     → Status badges
Tooltip.tsx                   → Hover tooltips
HoverCard.tsx                 → Hover preview card
```

### Feedback
```
Toast.tsx                     → Toast notifications (Sonner)
Toaster.tsx                   → Toast container
Alert.tsx                     → Alert boxes
Progress.tsx                  → Progress bars
Skeleton.tsx                  → Loading skeletons
```

### Forms
```
Form.tsx                      → React Hook Form wrapper
FormField.tsx                 → Form field component
FormControl.tsx               → Control wrapper
FormLabel.tsx                 → Field label
FormMessage.tsx               → Error message
```

### Charts
```
Chart.tsx                     → Recharts wrapper
```

---

## 7. COMPONENTES GAMIFICATION

```
AchievementUnlockedModal.tsx  → Modal de achievement desbloqueado
AchievementsGrid.tsx          → Grid de achievements
```

---

## 8. PADRÃO DE ESTRUTURA

### Típico Componente Custom

```
Component.tsx
├── Imports (React, dependencies)
├── Interface para Props
├── Utility functions
├── Componente principal
│   ├── useState (se necessário)
│   ├── useEffect (se necessário)
│   ├── useQuery/useMutation (se necessário)
│   ├── JSX
│   └── Styling com cn()
└── Export nomeado
```

---

## 9. LOCALIZAÇÃO DOS ARQUIVOS

```
src/components/
├── ClientLayout.tsx
├── Navbar.tsx
├── ClientSidebar.tsx
├── ContentHeader.tsx
├── CourseCard.tsx
├── HeroBanner.tsx
├── DynamicCarousel.tsx
├── UniversalVideoPlayer.tsx
├── LessonSidebar.tsx
├── LessonMaterials.tsx
├── SearchBar.tsx
├── NotificationBell.tsx
├── EditProfileModal.tsx
├── ChangePasswordModal.tsx
├── NavLink.tsx
├── CarouselIndicators.tsx
│
├── admin/
│   ├── AdminLayout.tsx
│   ├── AdminSidebar.tsx
│   ├── LayoutCustomization.tsx
│   ├── BrandingCustomization.tsx
│   ├── CourseFormModal.tsx
│   ├── CreateStudentModal.tsx
│   ├── CreateCarouselModal.tsx
│   ├── CategoryManagerModal.tsx
│   ├── AssignCoursesModal.tsx
│   ├── CourseSelector.tsx
│   │
│   └── dashboard/
│       ├── StatsOverview.tsx
│       ├── ActivityChart.tsx
│       ├── CourseDistributionChart.tsx
│       ├── CoursesMetricsTable.tsx
│       ├── RecentStudents.tsx
│       ├── RecentComments.tsx
│       ├── ActivityTimeline.tsx
│       ├── WebhookStats.tsx
│       ├── EngagementCard.tsx
│       ├── ContentCard.tsx
│       └── SalesMetrics.tsx
│
├── checkout/
│   ├── CheckoutLayout.tsx
│   ├── CustomerForm.tsx
│   ├── PaymentMethods.tsx
│   ├── CustomCardForm.tsx
│   └── OrderSummary.tsx
│   └── OrderBumpCard.tsx
│
├── profile/
│   ├── ProfileHero.tsx
│   └── CoursesInProgress.tsx
│
├── gamification/
│   ├── AchievementUnlockedModal.tsx
│   └── AchievementsGrid.tsx
│
└── ui/
    ├── button.tsx
    ├── card.tsx
    ├── input.tsx
    ├── label.tsx
    ├── form.tsx
    ├── sidebar.tsx
    ├── dialog.tsx
    ├── table.tsx
    ├── toast.tsx
    ├── sonner.tsx
    ├── badge.tsx
    ├── tabs.tsx
    ├── accordion.tsx
    ├── collapsible.tsx
    ├── dropdown-menu.tsx
    ├── sheet.tsx
    ├── breadcrumb.tsx
    ├── pagination.tsx
    ├── progress.tsx
    ├── skeleton.tsx
    ├── avatar.tsx
    ├── scroll-area.tsx
    ├── resizable.tsx
    ├── popover.tsx
    ├── hover-card.tsx
    ├── tooltip.tsx
    ├── alert.tsx
    ├── context-menu.tsx
   
