// Global audio manager to prevent multiple audio sources playing simultaneously
// All audio components should register/unregister with this manager

type AudioSource = {
  id: string;
  context: AudioContext;
  stop: () => void;
};

class AudioManager {
  private activeSources: Map<string, AudioSource> = new Map();
  private activeCategory: string | null = null;

  // Register an audio source - will stop all other sources first
  register(id: string, context: AudioContext, stopCallback: () => void, category: string = 'default') {
    // Stop all existing sources when a new one starts
    this.stopAll(id);
    
    this.activeSources.set(id, {
      id,
      context,
      stop: stopCallback,
    });
    this.activeCategory = category;
  }

  // Unregister when component unmounts
  unregister(id: string) {
    const source = this.activeSources.get(id);
    if (source) {
      if (source.context.state !== 'closed') {
        source.context.close().catch(() => {});
      }
      this.activeSources.delete(id);
    }
    
    if (this.activeSources.size === 0) {
      this.activeCategory = null;
    }
  }

  // Stop all sources except the one with excludeId
  stopAll(excludeId?: string) {
    this.activeSources.forEach((source, id) => {
      if (id !== excludeId) {
        try {
          source.stop();
          if (source.context.state !== 'closed') {
            source.context.close().catch(() => {});
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
        this.activeSources.delete(id);
      }
    });
  }

  // Check if a category is currently active
  isActive(category: string): boolean {
    return this.activeCategory === category;
  }

  // Get count of active sources (for debugging)
  getActiveCount(): number {
    return this.activeSources.size;
  }
}

// Singleton instance
export const audioManager = new AudioManager();
