import { useEffect } from "react";

interface ShortcutHandlers {
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onOpenChat?: () => void;
  onBack?: () => void;
  onFocusCompose?: () => void;
}

/**
 * Global keyboard shortcut handler.
 * 
 * Shortcuts:
 * - ArrowUp/ArrowDown: Navigate agent list
 * - Enter: Open selected agent chat
 * - Escape: Go back to agent list
 * - /: Focus compose input
 * - Ctrl+K: Clear chat (future)
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        // Only handle Escape when in input
        if (e.key === "Escape") {
          handlers.onBack?.();
          (target as HTMLInputElement).blur();
        }
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          handlers.onNavigateUp?.();
          break;
        case "ArrowDown":
          e.preventDefault();
          handlers.onNavigateDown?.();
          break;
        case "Enter":
          e.preventDefault();
          handlers.onOpenChat?.();
          break;
        case "Escape":
          e.preventDefault();
          handlers.onBack?.();
          break;
        case "/":
          e.preventDefault();
          handlers.onFocusCompose?.();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
