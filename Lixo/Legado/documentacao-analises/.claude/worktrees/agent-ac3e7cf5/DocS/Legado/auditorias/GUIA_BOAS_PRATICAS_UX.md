# Guia de Boas Práticas - UX/Design Neo Vidya Stream

## 1. PADRÕES DE IMPLEMENTAÇÃO

### 1.1 Criar Novo Componente

**Template:**
```tsx
import { cn } from "@/lib/utils";
import { ComponentPropsWithoutRef } from "react";

interface MyComponentProps extends ComponentPropsWithoutRef<"div"> {
  title: string;
  isLoading?: boolean;
  variant?: "default" | "secondary";
}

export function MyComponent({ 
  title, 
  isLoading, 
  variant = "default",
  className,
  ...props 
}: MyComponentProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all",
        variant === "default" && "bg-card border-border",
        variant === "secondary" && "bg-muted border-border/50",
        isLoading && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {isLoading ? <Skeleton /> : <span>{title}</span>}
    </div>
  );
}
```

**Princípios:**
- Sempre use `cn()` para merge classes
- Suporte `className` prop para customização
- Forneça `...props` para atributos adicionais
- Implemente variantes via props
- Use Skeleton para loading states

---

### 1.2 Responsive Design Pattern

**Mobile-First Approach:**
```tsx
// ❌ ERRADO
<div className="hidden md:flex">Desktop only</div>

// ✅ CORRETO
<div className="flex md:hidden">Mobile</div>
<div className="hidden md:flex">Desktop</div>
```

**Grid Responsivo:**
```tsx
// ❌ ERRADO
<div className="grid grid-cols-4">
  {/* Same on all screens */}
</div>

// ✅ CORRETO
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  {/* Adapts: 1 col mobile, 2 tablet, 4 desktop */}
</div>
```

---

### 1.3 Controle de Espaçamento

**Padding Consistente:**
```tsx
// ❌ ERRADO
<div className="p-2 md:p-6 lg:p-12">
  {/* Inconsistent spacing */}
</div>

// ✅ CORRETO
<div className="p-4 md:p-6 lg:p-8">
  {/* Consistent scale: 4px → 6px → 8px = 16px, 24px, 32px */}
</div>
```

**Gap em Flex:**
```tsx
<div className="flex gap-3 md:gap-4">
  {/* 12px mobile, 16px tablet+ */}
</div>
```

---

### 1.4 Cards Pattern

```tsx
// Reusable card wrapper
<div className="glass-card rounded-lg p-4 md:p-6 border border-white/10">
  <h3 className="font-semibold mb-3">{title}</h3>
  <p className="text-sm text-muted-foreground">{description}</p>
</div>
```

**Aplicar:**
```css
.glass-card {
  @apply bg-gradient-to-br from-card/60 to-card/40 backdrop-blur-xl;
}
```

---

### 1.5 Form Pattern

```tsx
<form onSubmit={form.handleSubmit(onSubmit)}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input 
            placeholder="seu@email.com" 
            {...field} 
            onChange={(e) => {
              // Custom masking if needed
              field.onChange(customMask(e.target.value));
            }}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
  
  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? "Enviando..." : "Enviar"}
  </Button>
</form>
```

---

### 1.6 Modal Pattern

```tsx
const [isOpen, setIsOpen] = useState(false);

return (
  <>
    <Button onClick={() => setIsOpen(true)}>Abrir</Button>
    
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Título</DialogTitle>
          <DialogDescription>Descrição opcional</DialogDescription>
        </DialogHeader>
        
        {/* Content */}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
);
```

---

### 1.7 Loading State Pattern

```tsx
// Option 1: Skeleton
{isLoading ? (
  <div className="space-y-3">
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-64 w-full" />
  </div>
) : (
  // Content
)}

// Option 2: Spinner
{isLoading && (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
  </div>
)}

// Option 3: Disabled state
<Button disabled={isLoading}>
  {isLoading ? "Carregando..." : "Enviar"}
</Button>
```

---

### 1.8 Error Handling Pattern

```tsx
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Erro</AlertTitle>
    <AlertDescription>{error.message}</AlertDescription>
  </Alert>
)}
```

---

### 1.9 Toast Notifications

```tsx
import { toast } from "sonner";

// Success
toast.success("Operação concluída com sucesso!");

// Error
toast.error("Ocorreu um erro. Tente novamente.");

// Loading
const { dismiss } = toast.loading("Processando...");

// Custom
toast.custom((t) => (
  <div>Custom notification</div>
));

// Promise
toast.promise(
  fetchData(),
  {
    loading: "Carregando...",
    success: "Concluído!",
    error: "Erro!"
  }
);
```

---

## 2. ACESSIBILIDADE - CHECKLIST

### 2.1 Semantic HTML

```tsx
// ✅ CORRETO
<header>Navigation</header>
<nav>Menu items</nav>
<main>Content</main>
<article>Article</article>
<aside>Sidebar</aside>
<footer>Footer</footer>

// ❌ ERRADO
<div role="header">
<div role="navigation">
<div role="main">
```

### 2.2 ARIA Labels

```tsx
// ✅ CORRETO
<button aria-label="Abrir menu">
  <Menu className="w-5 h-5" />
</button>

// Para screen readers
<span className="sr-only">Informação adicional</span>

// Descrição de input
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### 2.3 Keyboard Navigation

```tsx
// ✅ CORRETO
<button onClick={handleClick} onKeyDown={handleKeyDown}>
  Click me
</button>

// Usar <button> não <div>
// Usar <a> para links, não <div onClick>

// Tab order (use tabIndex sparingly)
<button tabIndex={-1}>Skip</button>
```

### 2.4 Focus Management

```tsx
// ✅ CORRETO
<Button className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
  Clique-me
</Button>

// Sempre mostre focus indicator
.focus-visible:ring-2
.focus-visible:outline-none
```

### 2.5 Color Contrast

```
✅ WCAG AA Compliant:
- Foreground (98% white) on Background (8% black) = 17.5:1
- Primary on Background ≈ 7:1

❌ Do NOT rely on color alone:
- Use icons + color for status
- Use text + icon for feedback
```

---

## 3. PERFORMANCE - CHECKLIST

### 3.1 Code Splitting

```tsx
// ✅ CORRETO
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));

<Suspense fallback={<DashboardSkeleton />}>
  <AdminDashboard />
</Suspense>
```

### 3.2 Image Optimization

```tsx
// ✅ CORRETO
<img 
  src={image} 
  alt="Descrição" 
  loading="lazy"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>

// Use AspectRatio para evitar layout shift
<AspectRatio ratio={16/9}>
  <img src={image} alt="..." />
</AspectRatio>
```

### 3.3 Query Optimization

```tsx
// ✅ CORRETO - Nested selects (evita N+1)
const { data } = await supabase
  .from("courses")
  .select(`
    id, title,
    modules (id, lessons (id)),
    user_progress (id)
  `);

// ✅ CORRETO - Queries paralelas
await Promise.all([
  supabase.from("courses").select(...),
  supabase.from("students").select(...)
]);

// ❌ ERRADO - Sequential queries
const courses = await fetchCourses();
const students = await fetchStudents(); // waits for courses first
```

---

## 4. ESTILO - CHECKLIST

### 4.1 Usar Design Tokens

```tsx
// ❌ ERRADO
<div className="rounded-lg border" style={{color: '#F63C3C'}}>

// ✅ CORRETO
<div className="rounded-lg border text-primary">
```

### 4.2 Gradientes

```tsx
// ✅ CORRETO
<div className="bg-gradient-to-br from-primary to-orange-600">
// or
<div style={{background: 'var(--gradient-primary)'}}>
```

### 4.3 Animações

```tsx
// ✅ CORRETO
<div className="animate-fade-in"> {/* 0.5s ease-out */}

// ✅ CORRETO - Custom
<div className="transition-all duration-300 hover:scale-105">

// ❌ ERRADO - Muito rápido ou sem transição
<div className="scale-105">
```

### 4.4 Shadows

```tsx
// ✅ CORRETO
<div className=
