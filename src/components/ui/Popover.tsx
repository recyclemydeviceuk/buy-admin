import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

interface Props {
  anchor: RefObject<HTMLElement>;
  open: boolean;
  align?: 'left' | 'right';
  width?: number | 'anchor';
  minWidth?: number;
  className?: string;
  children: ReactNode;
}

/** Renders `children` in a portal just below `anchor`, flipping above when there is no room. */
export function Popover({ anchor, open, align = 'left', width, minWidth = 200, className, children }: Props) {
  const [style, setStyle] = useState<React.CSSProperties | null>(null);
  useLayoutEffect(() => {
    if (!open || !anchor.current) {
      setStyle(null);
      return;
    }
    const update = () => {
      const r = anchor.current!.getBoundingClientRect();
      const w = width === 'anchor' ? r.width : (width ?? Math.max(minWidth, 0));
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = align === 'right' ? r.right - (width === 'anchor' ? r.width : w) : r.left;
      left = Math.max(8, Math.min(left, vw - w - 8));
      const below = vh - r.bottom;
      const flip = below < 280 && r.top > below;
      setStyle({ position: 'fixed', top: flip ? undefined : r.bottom + 6, bottom: flip ? vh - r.top + 6 : undefined, left, width: width === 'anchor' ? r.width : width, minWidth: width ? undefined : minWidth, zIndex: 120 });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchor, align, width, minWidth]);
  if (!open || !style) return null;
  return createPortal(<div data-popover style={style} className={cn('animate-pop rounded-2xl border border-line bg-white shadow-float', className)}>{children}</div>, document.body);
}

/** True when the event target is inside the anchor or any open popover. */
export function insidePopover(target: EventTarget | null, anchor: HTMLElement | null) {
  const el = target as HTMLElement | null;
  return !!el && (!!anchor?.contains(el) || !!el.closest?.('[data-popover]'));
}
