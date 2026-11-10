# Diagramas Estruturais - Neo Vidya Stream

## 1. ARQUITETURA DE LAYOUTS

### 1.1 Layout Hierarquia

```
App.tsx
├── Router
│   ├── Public Routes
│   │   ├── /login → Login Page
│   │   ├── / → Index Page
│   │   └── /curso/:id/info → CourseInfo (sem layout)
│   │
│   ├── CheckoutLayout Routes
│   │   ├── /checkout/:productId → Checkout
│   │   └── /checkout/:productId/thank-you → ThankYou
│   │
│   ├── ClientLayout Routes
│   │   ├── /dashboard → Dashboard
│   │   ├── /curso/:courseId → Course
│   │   ├── /aula/:lessonId → Lesson
│   │   └── /perfil → Profile
│   │
│   └── AdminLayout Routes
│       ├── /admin → Dashboard
│       ├── /admin/cursos → Courses
│       ├── /admin/alunos → Students
│       ├── /admin/vendas → SalesDashboard
│       ├── /admin/pedidos → Orders
│       ├── /admin/clientes → Customers
│       ├── /admin/produtos → Products
│       ├── /admin/gateways → Gateways
│       ├── /admin/webhooks → WebhookHub
│       ├── /admin/emails → EmailSettings
│       ├── /admin/whatsapp → WhatsAppSettings
│       ├── /admin/notificacoes → Notifications
│       ├── /admin/comentarios → Comments
│       ├── /admin/carrosseis → Carousels
│       └── /admin/personalizacao → ThemeCustomization
```

---

### 1.2 ClientLayout - Desktop (Both Mode)

```
┌─ Navbar (sticky, z-50)
├─ Main (h-screen overflow-hidden flex)
│  ├─ ClientSidebar (collapsible, border-r)
│  │  ├─ Header (logo)
│  │  ├─ UserProfile
│  │  │  ├─ Avatar (h-16 w-16)
│  │  │  ├─ Name
│  │  │  ├─ Level badge
│  │  │  ├─ XP Progress
│  │  │  └─ Streak
│  │  ├─ Navigation
│  │  │  ├─ Dashboard
│  │  │  └─ Meu Perfil
│  │  ├─ Admin Section (if isAdmin)
│  │  │  └─ Admin Panel
│  │  └─ Footer (Logout)
│  │
│  └─ Main Content (flex-1 flex flex-col overflow-hidden)
│     ├─ ContentHeader (h-14, border-b)
│     │  ├─ Toggle Sidebar
│     │  ├─ Breadcrumbs (hidden md:flex)
│     │  ├─ SearchBar
│     │  ├─ NotificationBell
│     │  └─ Avatar Dropdown
│     │
│     └─ Content Area (flex-1 overflow-y-auto scrollbar-styled)
│        └── <Page Component>
```

---

### 1.3 ClientLayout - Mobile

```
┌─ Navbar (sticky, z-50)
│  ├─ Logo (reduced)
│  ├─ SearchBar (icon only)
│  ├─ NotificationBell
│  └─ DropdownMenu (3 items + user info + logout)
│
└─ Main (flex-1)
   └── <Page Component>
```

---

### 1.4 AdminLayout - Desktop

```
┌─ AdminSidebar (collapsible, always visible)
│  ├─ Header (logo)
│  ├─ Back to Client Area
│  ├─ Members Area
│  │  ├─ Dashboard
│  │  ├─ Carrosséis
│  │  ├─ Cursos
│  │  ├─ Alunos
│  │  ├─ Comentários
│  │  └─ Personalização
│  ├─ Payment Area
│  │  ├─ Vendas
│  │  ├─ Pedidos
│  │  ├─ Clientes
│  │  ├─ Produtos
│  │  ├─ Checkout
│  │  ├─ Orderbump
│  │  ├─ Webhooks
│  │  └─ Gateways
│  ├─ Notifications Area
│  │  ├─ Notificações
│  │  ├─ Emails
│  │  └─ WhatsApp
│  └─ Footer (Logout)
│
├─ Main Content (flex-1 flex flex-col overflow-hidden)
│  ├─ ContentHeader (h-14, border-b)
│  ├─ Container (max-w-none, p-6)
│  └─ Page Content (flex-1 overflow-y-auto)
```

---

### 1.5 CheckoutLayout

```
┌─ Header (bg-background, border-b)
│  ├─ Logo + EduStream text
│  └─ Lock icon + "Ambiente Seguro"
│
├─ Main (flex-1, container max-w-6xl)
│  ├─ Desktop: grid-cols-3
│  │  ├─ col-span-2: Forms
│  │  └─ col-span-1: OrderSummary sidebar
│  │
│  └─ Mobile: single column
│     ├─ Forms (stacked)
│     └─ OrderSummary
│
└─ Footer (bg-background, border-t)
   ├─ Copyright
   └─ Links
```

---

## 2. COMPONENTES GRID & RESPONSIVIDADE

### 2.1 CourseCard Grid

```
Desktop (≥1024px):
│ Card │ Card │ Card │ Card │ Card │
└──────┴──────┴──────┴──────┴──────┘

Tablet (768px-1024px):
│ Card │ Card │ Card │
└──────┴──────┴──────┘

Mobile (<768px):
│ Card │
├──────┤
│ Card │
├──────┤
│ Card │
```

### 2.2 Dashboard Layout

```
Desktop (≥1024px):
┌────────────────────┬────────┐
│  Hero Banner       │        │
├────────────────────┼────────┤
│  Continue Section  │        │
│  (Carousel)        │        │
├────────────────────┼────────┤
│  Dynamic Carousel 1│        │
├────────────────────┼────────┤
│  Dynamic Carousel 2│        │
└────────────────────┴────────┘

Mobile (<768px):
┌──────────────────┐
│  Hero Banner     │
├──────────────────┤
│  Continue        │
│  (Carousel)      │
├──────────────────┤
│  Carousel 1      │
├──────────────────┤
│  Carousel 2      │
└──────────────────┘
```

---

## 3. FLUXO VISUAL - PÁGINA DE AULA

```
┌─────────────────────────────────────────────┐
│ Navbar (sticky)                             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────┬─────┐   │
│  │                               │ │   │   │
│  │  Video Player                 │ │ L │   │
│  │  ┌─────────────────────────┐  │ │ E │   │
│  │  │   HLS/YouTube Player    │  │ │ S │   │
│  │  │                         │  │ │ S │   │
│  │  └─────────────────────────┘  │ │ O │   │
│  │                               │ │ N │   │
│  ├───────────────────────────────┤ │   │   │
│  │                               │ │ S │   │
│  │  Description / Tabs           │ │ I │   │
│  │  ├─ Description              │ │ D │   │
│  │  ├─ Materials                │ │ E │   │
│  │  └─ Comments (Thread)        │ │ B │   │
│  │                               │ │ A │   │
│  │  ┌────────────────────────┐  │ │ R │   │
│  │  │ Comment Form (Textarea)│  │ │   │   │
│  │  └────────────────────────┘  │ │   │   │
│  │                               │ │   │   │
│  │  ┌────────────────────────┐  │ └─────┘   │
│  │  │ Comment 1              │  │           │
│  │  │ > Reply to Comment 1   │  │           │
│  │  │ > Reply to Comment 1   │  │           │
│  │  └────────────────────────┘  │           │
│  │                               │           │
│  │  ┌────────────────────────┐  │           │
│  │  │ Comment 2              │  │           │
│  │  └────────────────────────┘  │           │
│  │                               │           │
│  └───────────────────────────────┴─────────┘
│                                             │
└─────────────────────────────────────────────┘

Mobile: Single column (video > content > sidebar)
```

---

## 4. CHECKPOINT VISUAL - CHECKOUT

```
Desktop (≥768px):
┌────────────────────────┬──────────────┐
│                        │              │
│  Forms (2/3):          │ OrderSummary │
│  ├─ CustomerForm      │              │
│  ├─ PaymentMethods    │ ┌──────────┐ │
│  ├─ CustomCardForm    │ │ Product  │ │
│  ├─ OrderBumps        │ │ + Bumps  │ │
│  └─ Submit Btn        │ │ Total    │ │
│                        │ │ Security │ │
│                        │ └──────────┘ │
└────────────────────────┴──────────────┘

Mobile (<768px):
┌─────────────────────┐
│ CustomerForm        │
├─────────────────────┤
│ PaymentMethods      │
├─────────────────────┤
│ CustomCardForm      │
├─────────────────────┤
│ OrderBumps          │
├─────────────────────┤
│ OrderSummary        │
├─────────────────────┤
│ Submit Button       │
└─────────────────────┘
```

---

## 5. HIERARQUIA DE CORES

```
Primary (Red/Orange):        #F63C3C (0 85% 60%)
Primary Foreground:          #FFFFFF (white on red)

Background (Dark):           #0F1419 (240 10% 8%)
Foreground (Text):           #FAFAF8 (almost white)

Card Background:             #1A1F26 (240 8% 12%)
Card Foreground:             #FAFAF8

Muted (Secondary text):      #64748B (240 5% 64%)
Muted Background:            #1F252E (240 6% 15%)

Border:                      #333944 (240 6% 20%)

Gradient Primary:
  135deg from #F63C3C to #FF8C42

Glass Card:
  bg-gradient-to-br from-card/60 to-card/40
  backdrop-blur-xl
  border border-white/10
```

---

## 6. TIPOGRAFIA HIERARCHY

```
H1 (Hero title)
  ├─ Size: 3xl-7xl (48px-80px)
  ├─ Weight: 900 (black)
  └─ Line-height: 0.95 (tight)

H2 (Section headers)
  ├─ Size: xl-2xl (20px-24px)
  ├─ Weight: 800
  └─ Line-height: 1.2

H3 (Card titles)
  ├─ Size: lg-xl (18px-20px)
  ├─ Weight: 700-800
  └─ Line-height: 1.25

Body (Content)
  ├─ Size: base (16px)
  ├─ Weight: 400
  └─ Line-height: 1.5

Label (Form labels)
  ├─ Size: sm (14px)
  ├─ Weight: 500 (medium)
  └─ Line-
