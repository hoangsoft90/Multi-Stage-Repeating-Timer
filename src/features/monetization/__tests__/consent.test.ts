import { ConsentDecision, resolveNonPersonalized } from '../consent';

const base: ConsentDecision = {
  attStatus: 'authorized',
  consentStatus: 'not_required',
};

describe('resolveNonPersonalized (spec: policy — NPA fallback)', () => {
  it('ngoài khu vực consent + ATT authorized → personalized (không NPA)', () => {
    expect(resolveNonPersonalized(base)).toBe(false);
  });

  it('ngoài khu vực consent + ATT denied → NPA (fallback, ads vẫn serve)', () => {
    expect(resolveNonPersonalized({ ...base, attStatus: 'denied' })).toBe(true);
    expect(resolveNonPersonalized({ ...base, attStatus: 'restricted' })).toBe(true);
  });

  it('khu vực consent (obtained) + user đồng ý personalized → không NPA', () => {
    expect(
      resolveNonPersonalized({ attStatus: 'undetermined', consentStatus: 'obtained', personalizedConsent: true }),
    ).toBe(false);
  });

  it('khu vực consent (obtained) + user từ chối personalized → NPA', () => {
    expect(
      resolveNonPersonalized({ attStatus: 'undetermined', consentStatus: 'obtained', personalizedConsent: false }),
    ).toBe(true);
  });

  it('consent chưa rõ (unknown/required) → theo ATT (an toàn)', () => {
    expect(resolveNonPersonalized({ ...base, consentStatus: 'unknown' })).toBe(false);
    expect(resolveNonPersonalized({ ...base, consentStatus: 'required', attStatus: 'denied' })).toBe(true);
  });
});
