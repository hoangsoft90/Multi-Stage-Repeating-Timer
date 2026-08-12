/**
 * FeedbackCoordinator (spec: feedback) — subscribes engine events and drives
 * audio / haptics / notifications, respecting Settings toggles. Never blocks
 * or crashes the timer.
 */
import { TimerEngine } from '../../core/timer/engine';
import { audio, haptics, notifications, observability, speech } from '../../platform';
import { Settings } from '../../core/storage/repos';
import { DEFAULT_SOUND_ID, resolveSoundId, soundById } from '../sounds/sound-pack';
import { getUserSound } from '../sounds/user-sounds-store';
import { getUnlockExpiry } from '../monetization/rewarded-unlock';
import { t } from '../../i18n';

export class FeedbackCoordinator {
  private settings: Settings;
  private engine: TimerEngine;

  constructor(engine: TimerEngine, settings: Settings) {
    this.engine = engine;
    this.settings = settings;
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    audio.setEnabled(settings.soundEnabled);
    haptics.setEnabled(settings.vibrationEnabled);
    speech.setEnabled(settings.voiceEnabled);
  }

  attach(): void {
    this.engine.events.subscribe((event) => {
      void this.onEvent(event);
    });
  }

  private async onEvent(
    event: import('../../core/timer/events').TimerEvent,
  ): Promise<void> {
    try {
      switch (event.type) {
        case 'StageStarted': {
          // Play the stage's own transition sound. Custom-pack sounds are
          // only allowed while the Rewarded unlock (24h) is live — enforce
          // at PLAY time, not just at picker time, so an expired unlock
          // can't keep the pack permanently.
          const stage = this.engine.getSession()?.stagesSnapshot[event.index];
          const soundId = stage?.soundId;
          // User-imported sounds play forever (ad only gates the import —
          // product decision), so resolve them BEFORE the bundled catalog
          // (otherwise resolveSoundId falls back to the default chime).
          const userSound = getUserSound(soundId);
          let playId = userSound ? userSound.id : resolveSoundId(soundId);
          if (!userSound) {
            const option = soundById(soundId);
            if (option?.locked && !(await getUnlockExpiry())) {
              playId = DEFAULT_SOUND_ID;
            }
          }
          await audio.play(playId);
          await haptics.vibrate('pattern-light');
          // Voice coaching: read the stage name aloud (hands-free).
          if (this.settings.voiceEnabled && stage?.name) {
            void speech.speak(stage.name).catch(() => {});
          }
          break;
        }
        case 'StageCompleted':
          await audio.play('chime-down');
          await haptics.vibrate('pattern-light');
          break;
        case 'RoundCompleted':
          await haptics.vibrate('pattern-strong');
          break;
        case 'SessionCompleted':
          await audio.play('chime-done');
          await haptics.vibrate('pattern-strong');
          await notifications.present(t('notif.completedTitle'), t('notif.completedBody'));
          if (this.settings.voiceEnabled) {
            void speech.speak(t('voice.completed')).catch(() => {});
          }
          break;
        default:
          break;
      }
    } catch {
      // feedback must never break the timer
    }
  }

  trackMissedTransitions(missed: boolean): void {
    observability.trackTransition(missed);
  }
}
