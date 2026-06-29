import { useState, useRef, type KeyboardEvent } from "react";

interface Props {
  onSend: (body: string) => Promise<void> | void;
  disabled?: boolean;
}

export default function Compose({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await onSend(body);
      setText("");
      taRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Auto-grow the textarea up to 6 lines.
  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 144) + "px";
  };

  return (
    <div style={styles.wrap}>
      <textarea
        ref={taRef}
        value={text}
        onChange={onInput}
        onKeyDown={onKey}
        placeholder="Send a message — Enter to send, Shift+Enter for newline"
        rows={1}
        disabled={disabled || sending}
        style={styles.input}
      />
      <button
        className="primary"
        onClick={submit}
        disabled={disabled || sending || !text.trim()}
        style={styles.send}
      >
        {sending ? "…" : "Send"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: "1px solid var(--border)",
    background: "var(--bg-1)",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    resize: "none",
    minHeight: 38,
    maxHeight: 144,
    lineHeight: 1.4,
  },
  send: {
    height: 38,
    alignSelf: "flex-end",
  },
};
