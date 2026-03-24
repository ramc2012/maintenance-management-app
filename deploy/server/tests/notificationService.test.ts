import { describe, expect, it } from 'vitest';
import { classifyDueStatus } from '../src/services/notificationService';

describe('classifyDueStatus', () => {
  const now = new Date('2026-03-13T00:00:00.000Z');

  it('returns OVERDUE for past dates', () => {
    expect(classifyDueStatus(new Date('2026-03-12T00:00:00.000Z'), 14, now)).toBe('OVERDUE');
  });

  it('returns DUE_SOON inside the lead window', () => {
    expect(classifyDueStatus(new Date('2026-03-20T00:00:00.000Z'), 14, now)).toBe('DUE_SOON');
  });

  it('returns UPCOMING outside the lead window', () => {
    expect(classifyDueStatus(new Date('2026-04-30T00:00:00.000Z'), 14, now)).toBe('UPCOMING');
  });
});
