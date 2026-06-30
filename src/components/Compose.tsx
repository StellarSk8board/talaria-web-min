import { useState, useRef, type KeyboardEvent } from "react";

interface Props {
  onSend: (body: string) => Promise<void> | void;
  onSendAudio?: (blob: Blob) => Promise<void> | void;
  onSendFile?: (file: File) => Promise<void> | void;
  disabled?: boolean;
}

export default function Compose({ onSend, onSendAudio, onSendFile, disabled }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 144) + "px";
  };

  const startRecording = async () => {
    if (!onSendAudio || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (blob.size > 0 && onSendAudio) {
          try {
            await onSendAudio(blob);
          } catch (err) {
            console.error("Failed to send audio:", err);
          }
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setRecording(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onSendFile) return;
    try {
      await onSendFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Failed to send file:", err);
      alert("Failed to send file: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
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
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      {onSendFile && (
        <button
          onClick={triggerFileSelect}
          disabled={disabled || sending}
          style={styles.iconBtn}
          title="Upload file"
          aria-label="Upload file"
        >
          📎
        </button>
      )}
      {onSendAudio && (
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={disabled || sending}
          style={{
            ...styles.iconBtn,
            background: recording ? "var(--danger)" : "var(--bg-2)",
            color: recording ? "#fff" : "var(--text-1)",
          }}
          title={recording ? "Stop recording" : "Record voice message"}
          aria-label={recording ? "Stop recording" : "Record voice message"}
        >
          {recording ? "■" : "🎤"}
        </button>
      )}
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
  iconBtn: {
    height: 38,
    width: 38,
    background: "var(--bg-2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-1)",
  },
  send: {
    height: 38,
    alignSelf: "flex-end",
  },
};
