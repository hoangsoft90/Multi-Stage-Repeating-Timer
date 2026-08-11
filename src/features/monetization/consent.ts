/**
 * Consent policy (spec: policy — UMP + non-personalized fallback, tasks 4.2).
 *
 * PURE decision helper — no platform imports, unit-testable. The native
 * consent service feeds it real values (ATT status, UMP consent status, and
 * the user's personalized-ads choice); web/Expo Go no-ops use defaults.
 *
 * Rule (matches Google guidance):
 * - In consent jurisdictions (UMP status OBTAINED) the Mobile Ads SDK already
 *   honors the user's choice — non-personalized only when the user declined
 *   personalized ads (the SDK would serve NPA anyway; we set the flag to be
 *   explicit and to also cover pre-consent unknown states).
 * - Everywhere else (NOT_REQUIRED / unknown): non-personalized when the user
 *   denied or restricted ATT (iOS). This is the fallback that keeps ads
 *   serving instead of failing entirely.
 */
import { AttService, ConsentStatus } from '../../platform/types';

/** User's ATT/tracking status (iOS) — same shape as AttService return. */
export type AttStatus = Awaited<ReturnType<AttService['requestTrackingPermission']>>;

export interface ConsentDecision {
  /** User's ATT/tracking status (iOS). */
  attStatus: AttStatus;
  /** UMP consent status (see AdsConsentStatus). */
  consentStatus: ConsentStatus;
  /**
   * UMP user choice: does the user allow personalized ads? Only meaningful
   * when consentStatus === 'obtained'; undefined elsewhere.
   */
  personalizedConsent?: boolean;
}

/**
 * Decide whether the NEXT ad request must be non-personalized-only.
 * Pure + deterministic.
 */
export function resolveNonPersonalized(input: ConsentDecision): boolean {
  const { attStatus, consentStatus, personalizedConsent } = input;
  if (consentStatus === 'obtained') {
    // Consent jurisdiction: trust the user's explicit choice.
    return personalizedConsent === false;
  }
  // Non-consent jurisdictions (or still unknown): ATT is the source of truth.
  return attStatus === 'denied' || attStatus === 'restricted';
}
