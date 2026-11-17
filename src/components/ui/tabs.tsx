import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  /** "sliding" move uma pill entre os gatilhos em vez de trocar o fundo seco. */
  variant?: "default" | "sliding";
};

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant = "default", children, ...props }, forwardedRef) => {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [pill, setPill] = React.useState<{ x: number; w: number } | null>(null);
  const sliding = variant === "sliding";

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [forwardedRef],
  );

  const measure = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
    if (!active) return;

    const listBox = list.getBoundingClientRect();
    const tabBox = active.getBoundingClientRect();
    // `left: 0` no pill é relativo ao padding box; desconta a borda do List.
    const borderLeft = parseFloat(getComputedStyle(list).borderLeftWidth) || 0;
    const next = { x: tabBox.left - listBox.left - borderLeft, w: tabBox.width };

    // Identidade estável: evita loop com o ResizeObserver.
    setPill((prev) => (prev && prev.x === next.x && prev.w === next.w ? prev : next));
  }, []);

  React.useLayoutEffect(() => {
    if (!sliding) {
      setPill(null);
      return;
    }

    measure();

    const list = listRef.current;
    if (!list) return;

    const observer = new MutationObserver(measure);
    observer.observe(list, { attributes: true, subtree: true, attributeFilter: ["data-state"] });

    const resize = new ResizeObserver(measure);
    resize.observe(list);
    Array.from(list.children).forEach((child) => {
      if (!child.classList.contains("t-tabs-pill")) resize.observe(child);
    });

    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [sliding, measure]);

  return (
    <TabsPrimitive.List
      ref={setRefs}
      data-sliding={sliding ? "true" : undefined}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        sliding && "relative",
        className,
      )}
      {...props}
    >
      {sliding && pill && (
        <span
          aria-hidden="true"
          className="t-tabs-pill"
          style={
            {
              "--pill-x": `${pill.x}px`,
              "--pill-w": `${pill.w}px`,
            } as React.CSSProperties
          }
        />
      )}
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      // Troca de aba entra com 150ms em vez de aparecer de uma vez.
      "t-content-in mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
