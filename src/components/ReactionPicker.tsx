const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '👀'];

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
  onClose: () => void;
}

export default function ReactionPicker({ onReact, onClose }: ReactionPickerProps) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.picker} onClick={(e) => e.stopPropagation()}>
        <div style={styles.emojiGrid}>
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              style={styles.emojiButton}
              onClick={() => {
                onReact(emoji);
                onClose();
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  picker: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  emojiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  emojiButton: {
    fontSize: '24px',
    padding: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
};
