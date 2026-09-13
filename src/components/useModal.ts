import { useEffect, useRef } from "react";

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

/** Contain keyboard focus for a visible dialog and restore its trigger on close. */
export function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previous = document.activeElement;
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((element) => element.getClientRects().length > 0);
    const first = dialog.querySelector<HTMLElement>('[data-autofocus]') ?? controls()[0] ?? dialog;
    first.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      } else if (event.key === "Tab") {
        const items = controls();
        const firstItem = items[0] ?? dialog;
        const lastItem = items[items.length - 1] ?? dialog;
        if (!items.length || !dialog.contains(document.activeElement)) {
          event.preventDefault();
          firstItem.focus();
        } else if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault();
          lastItem.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    };
    const keepFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) (controls()[0] ?? dialog).focus();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", keepFocus);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("focusin", keepFocus);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open]);

  return ref;
}
