import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, BookOpen, Sparkles, CheckCircle, TrendingUp, ChevronRight, ChevronDown, X } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';
import { useTheme } from '../state/ThemeContext';
import { Entry, EntryType, entryTypeLabels } from '../models/entries';

interface EntriesScreenProps {
  onNavigateHome?: () => void;
  onNavigateActivities?: () => void;
  onNavigateProfile?: () => void;
  onNavigateHelp?: () => void;
  onNavigateJournal?: () => void;
}

const typeIcons: Record<EntryType, React.ReactNode> = {
  session: <Activity size={18} strokeWidth={1.5} />,
  emotional_note: <BookOpen size={18} strokeWidth={1.5} />,
  ai_reflection: <Sparkles size={18} strokeWidth={1.5} />,
  check_in: <CheckCircle size={18} strokeWidth={1.5} />,
  pattern: <TrendingUp size={18} strokeWidth={1.5} />,
};

const typeColors: Record<EntryType, string> = {
  session: '#6B7A6E',
  emotional_note: '#8B7355',
  ai_reflection: '#7A6B8A',
  check_in: '#5A7A8A',
  pattern: '#8A6B5A',
};

export function EntriesScreen({
  onNavigateHome,
  onNavigateActivities,
  onNavigateProfile,
  onNavigateHelp,
  onNavigateJournal,
}: EntriesScreenProps) {
  const { entries, getEntriesByType } = useEntries();
  useTheme(); // Used for theme context
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<EntryType>>(new Set(['session', 'emotional_note']));

  const entryTypes: EntryType[] = ['session', 'emotional_note', 'ai_reflection', 'check_in', 'pattern'];

  const toggleSection = (type: EntryType) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const { theme } = useTheme();
  const isDark = theme === 'night';

  return (
    <div
      className={`relative w-full h-full overflow-hidden transition-colors duration-300 ${isDark ? 'night-texture' : ''}`}
      style={{
        background: isDark ? 'var(--bg)' : `linear-gradient(to bottom, var(--bg) 0%, var(--bg-soft) 100%)`,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(75, 75, 75, 0.04) 100%)',
        }}
      />

      <motion.div
        className="absolute w-full text-center z-20"
        style={{ top: '7%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <h1
          style={{
            fontFamily: 'ALORE, Georgia, serif',
            color: 'var(--text-primary)',
            fontWeight: 300,
            letterSpacing: '1em',
            fontSize: '11px',
            textShadow: `0 0 15px var(--orb-glow), 0 0 30px var(--orb-glow), 0 2px 4px rgba(0,0,0,0.15)`,
            opacity: 0.85,
          }}
        >
          TRACE
        </h1>
      </motion.div>

      <div 
        className="relative z-10 flex flex-col h-full pb-44 overflow-y-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          .entries-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <motion.div
          className="w-full px-6 text-center pt-20 pb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <h2
            style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: '28px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              letterSpacing: '0.02em',
              marginBottom: '8px',
            }}
          >
            Your Entries
          </h2>
          <p
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              opacity: 0.8,
            }}
          >
            {entries.length === 0 
              ? 'Your reflections will appear here'
              : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} saved`
            }
          </p>
        </motion.div>

        <motion.div
          className="px-4 flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {entries.length === 0 ? (
            <div 
              className="flex flex-col items-center justify-center py-16 px-6"
              style={{ minHeight: '200px' }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'var(--accent-soft)' }}
              >
                <BookOpen size={28} style={{ color: 'var(--text-secondary)', strokeWidth: 1.2 }} />
              </div>
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '15px',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}
              >
                No entries yet. Complete activities and save your reflections to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entryTypes.map((type) => {
                const typeEntries = getEntriesByType(type);
                if (typeEntries.length === 0) return null;
                
                const isExpanded = expandedSections.has(type);
                
                return (
                  <div key={type} className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)' }}>
                    <button
                      onClick={() => toggleSection(type)}
                      className="w-full flex items-center justify-between p-4 transition-colors"
                      style={{ background: 'var(--card-elevated)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ 
                            background: `${typeColors[type]}15`,
                            color: typeColors[type],
                          }}
                        >
                          {typeIcons[type]}
                        </div>
                        <div className="text-left">
                          <h3
                            style={{
                              fontFamily: 'Georgia, serif',
                              fontSize: '15px',
                              fontWeight: 500,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {entryTypeLabels[type]}
                          </h3>
                          <span
                            style={{
                              fontFamily: 'Georgia, serif',
                              fontSize: '12px',
                              color: 'var(--text-tertiary)',
                            }}
                          >
                            {typeEntries.length} {typeEntries.length === 1 ? 'entry' : 'entries'}
                          </span>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={20} style={{ color: 'var(--text-tertiary)' }} />
                      </motion.div>
                    </button>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {typeEntries.map((entry, index) => (
                              <motion.button
                                key={entry.id}
                                onClick={() => setSelectedEntry(entry)}
                                className="w-full text-left rounded-xl p-3 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                                style={{
                                  background: 'var(--card-elevated)',
                                  border: '1px solid var(--border)',
                                }}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.03 }}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <h4
                                    className="truncate"
                                    style={{
                                      fontFamily: 'Georgia, serif',
                                      fontSize: '14px',
                                      fontWeight: 500,
                                      color: 'var(--text-primary)',
                                    }}
                                  >
                                    {entry.title || entryTypeLabels[entry.type]}
                                  </h4>
                                  <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                </div>
                                {entry.body && (
                                  <p
                                    className="line-clamp-1"
                                    style={{
                                      fontFamily: 'Georgia, serif',
                                      fontSize: '12px',
                                      color: 'var(--text-secondary)',
                                      marginBottom: '4px',
                                    }}
                                  >
                                    {entry.body}
                                  </p>
                                )}
                                <span
                                  style={{
                                    fontFamily: 'Georgia, serif',
                                    fontSize: '11px',
                                    color: 'var(--text-tertiary)',
                                  }}
                                >
                                  {formatDate(entry.timestamp)} · {formatTime(entry.timestamp)}
                                </span>
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {onNavigateJournal && (
        <motion.div
          className="absolute z-30 left-0 right-0 px-4"
          style={{ bottom: '113px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <button
            onClick={onNavigateJournal}
            className="w-full rounded-full px-8 py-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
            style={{
              background: 'var(--card)',
              boxShadow: 'var(--shadow)',
              border: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                fontFamily: 'Georgia, serif',
                color: 'var(--text-primary)',
                fontWeight: 500,
                fontSize: '15px',
                letterSpacing: '0.02em',
              }}
            >
              Journal
            </span>
          </button>
        </motion.div>
      )}

      <BottomNav
        activeScreen="entries"
        variant="sage"
        onNavigateHome={onNavigateHome}
        onNavigateActivities={onNavigateActivities}
        onNavigateJournal={onNavigateJournal || (() => {})}
        onNavigateProfile={onNavigateProfile}
        onNavigateHelp={onNavigateHelp}
      />

      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center p-4"
            style={{ borderRadius: '44px', overflow: 'hidden' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/40"
              style={{ borderRadius: '44px' }}
              onClick={() => setSelectedEntry(null)}
            />
            <motion.div
              className="relative z-10 w-full rounded-[24px] p-5 pb-6"
              style={{
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                maxHeight: 'calc(100% - 48px)',
                overflowY: 'auto',
              }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
            >
              <button
                onClick={() => setSelectedEntry(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-soft)' }}
              >
                <X size={16} style={{ color: 'var(--text-primary)' }} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ 
                    background: `${typeColors[selectedEntry.type]}15`,
                    color: typeColors[selectedEntry.type],
                  }}
                >
                  {typeIcons[selectedEntry.type]}
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '11px',
                      color: typeColors[selectedEntry.type],
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {entryTypeLabels[selectedEntry.type]}
                  </p>
                  <h3
                    style={{
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontSize: '20px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {selectedEntry.title || 'Entry'}
                  </h3>
                </div>
              </div>

              <div className="mb-4">
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {formatDate(selectedEntry.timestamp)} at {formatTime(selectedEntry.timestamp)}
                  {selectedEntry.sourceScreen && ` · from ${selectedEntry.sourceScreen}`}
                </p>
              </div>

              {selectedEntry.body && (
                <div
                  className="p-4 rounded-xl mb-4"
                  style={{ background: 'var(--card)' }}
                >
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedEntry.body}
                  </p>
                </div>
              )}

              {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full"
                      style={{
                        background: 'var(--accent-soft)',
                        fontFamily: 'Georgia, serif',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {selectedEntry.metadata && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  {selectedEntry.metadata.duration && (
                    <p
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: '12px',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      Duration: {Math.floor(selectedEntry.metadata.duration / 60)}:{String(selectedEntry.metadata.duration % 60).padStart(2, '0')}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
