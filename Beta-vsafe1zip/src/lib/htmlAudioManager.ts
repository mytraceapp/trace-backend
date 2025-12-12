// Simple manager to coordinate HTML Audio elements across screens
// Ensures only one screen's audio plays at a time

class HtmlAudioManager {
  private activeAudios: Map<string, HTMLAudioElement[]> = new Map();

  // Register audio elements for a screen
  register(screenId: string, audios: HTMLAudioElement[]) {
    // Stop all other screens' audio first
    this.stopAllExcept(screenId);
    
    // Store this screen's audios
    this.activeAudios.set(screenId, audios);
  }

  // Unregister and stop a screen's audio
  unregister(screenId: string) {
    const audios = this.activeAudios.get(screenId);
    if (audios) {
      audios.forEach(audio => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      this.activeAudios.delete(screenId);
    }
  }

  // Stop all audio except for a specific screen
  stopAllExcept(exceptScreenId?: string) {
    this.activeAudios.forEach((audios, screenId) => {
      if (screenId !== exceptScreenId) {
        audios.forEach(audio => {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (e) {
            // Ignore cleanup errors
          }
        });
        this.activeAudios.delete(screenId);
      }
    });
  }

  // Stop all audio (useful when leaving activity screens)
  stopAll() {
    this.activeAudios.forEach((audios) => {
      audios.forEach(audio => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    });
    this.activeAudios.clear();
  }
}

export const htmlAudioManager = new HtmlAudioManager();
