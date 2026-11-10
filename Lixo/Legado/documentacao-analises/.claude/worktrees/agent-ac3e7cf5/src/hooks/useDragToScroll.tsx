import { useEffect, useRef, RefObject } from "react";

export const useDragToScroll = (containerRef: RefObject<HTMLElement>) => {
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const preventClickRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Shared drag logic
    const startDrag = (pageX: number) => {
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      preventClickRef.current = false;
      startXRef.current = pageX - container.offsetLeft;
      scrollLeftRef.current = container.scrollLeft;
      container.style.cursor = 'grabbing';
      container.style.userSelect = 'none';
      container.setAttribute('data-dragging', 'true');
    };

    const moveDrag = (pageX: number) => {
      if (!isDraggingRef.current) return;
      
      const x = pageX - container.offsetLeft;
      const walk = (x - startXRef.current) * 1.5;
      
      if (Math.abs(walk) > 5) {
        hasDraggedRef.current = true;
        preventClickRef.current = true;
      }
      
      container.scrollLeft = scrollLeftRef.current - walk;
    };

    const stopDrag = () => {
      const wasDragging = isDraggingRef.current;
      isDraggingRef.current = false;
      container.style.cursor = 'grab';
      container.style.userSelect = '';
      container.removeAttribute('data-dragging');
      
      // Keep preventClickRef true for a brief moment after drag
      if (wasDragging && hasDraggedRef.current) {
        setTimeout(() => {
          preventClickRef.current = false;
          hasDraggedRef.current = false;
        }, 100);
      }
    };

    // Mouse events (desktop)
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      // Ignore if clicking on buttons
      if (target.closest('button')) {
        return;
      }
      startDrag(e.pageX);
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      moveDrag(e.pageX);
    };

    // Touch events (mobile)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startDrag(e.touches[0].pageX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      moveDrag(e.touches[0].pageX);
    };

    // Prevent click if dragged
    const handleClick = (e: Event) => {
      if (preventClickRef.current || hasDraggedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    
    // Unified handler for container clicks (replaces per-link listeners)
    const handleContainerClick = (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Prevent any click during or right after dragging
      if (preventClickRef.current || hasDraggedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }
      
      // Prevent link navigation if clicking during drag state
      const link = target.closest('a');
      if (link && container.getAttribute('data-dragging') === 'true') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    // Add event listeners
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', stopDrag);
    container.addEventListener('mouseleave', stopDrag);
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', stopDrag);
    container.addEventListener('touchcancel', stopDrag);
    
    container.addEventListener('click', handleClick, { capture: true });
    container.addEventListener('click', handleContainerClick, { capture: true });

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', stopDrag);
      container.removeEventListener('mouseleave', stopDrag);
      
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', stopDrag);
      container.removeEventListener('touchcancel', stopDrag);
      
      container.removeEventListener('click', handleClick, { capture: true });
      container.removeEventListener('click', handleContainerClick, { capture: true });
    };
  });

  return {
    isDragging: isDraggingRef.current,
  };
};