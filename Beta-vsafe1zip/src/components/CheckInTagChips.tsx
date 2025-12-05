import React from 'react';
import { motion } from 'motion/react';

interface TagChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
}

function TagChip({ label, selected, onToggle }: TagChipProps) {
  return (
    <motion.button
      onClick={onToggle}
      className="rounded-full px-4 py-2 transition-all duration-300"
      style={{
        backgroundColor: selected ? '#D7C8B5' : '#EDE6DD',
        border: `1px solid rgba(43, 30, 21, ${selected ? 0.15 : 0.1})`,
        boxShadow: selected
          ? '0 2px 6px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
          : '0 1px 3px rgba(0,0,0,0.02)',
      }}
      whileTap={{ scale: 0.96 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span
        style={{
          fontFamily: 'SF Pro Text, -apple-system, sans-serif',
          fontSize: '13px',
          fontWeight: 400,
          color: selected ? '#4A3526' : '#7D5D47',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </span>
    </motion.button>
  );
}

interface CheckInTagChipsProps {
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
}

export function CheckInTagChips({ selectedTags = [], onTagsChange }: CheckInTagChipsProps) {
  const [internalSelectedTags, setInternalSelectedTags] = React.useState<string[]>(selectedTags);

  const tags = ['work', 'social', 'family', 'health', 'schedule shift', 'rest / recovery'];

  const handleToggle = (tag: string) => {
    const newSelectedTags = internalSelectedTags.includes(tag)
      ? internalSelectedTags.filter((t) => t !== tag)
      : [...internalSelectedTags, tag];
    
    setInternalSelectedTags(newSelectedTags);
    onTagsChange?.(newSelectedTags);
  };

  return (
    <div className="w-full">
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <p
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            fontWeight: 300,
            color: '#7D5D47',
            letterSpacing: '0.02em',
            marginBottom: '12px',
          }}
        >
          What's on your mind today?
        </p>
      </motion.div>

      <div className="flex flex-wrap gap-2.5">
        {tags.map((tag, index) => (
          <motion.div
            key={tag}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.08 }}
          >
            <TagChip
              label={tag}
              selected={internalSelectedTags.includes(tag)}
              onToggle={() => handleToggle(tag)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
