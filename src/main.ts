import { GameManager } from './core/GameManager.ts';
import { AudioManager } from './core/AudioManager.ts';

// Bootstrap MONSTER DUMB
window.addEventListener('DOMContentLoaded', () => {
  // Resume Web Audio on first user gesture
  const resumeAudio = () => {
    AudioManager.getInstance().init();
    AudioManager.getInstance().resume();
    window.removeEventListener('click', resumeAudio);
    window.removeEventListener('keydown', resumeAudio);
    window.removeEventListener('touchstart', resumeAudio);
  };

  window.addEventListener('click', resumeAudio, { once: true });
  window.addEventListener('keydown', resumeAudio, { once: true });
  window.addEventListener('touchstart', resumeAudio, { once: true });

  // Initialize Game Manager
  const game = GameManager.getInstance();
  game.init();
});
