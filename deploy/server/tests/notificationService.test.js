"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const notificationService_1 = require("../src/services/notificationService");
(0, vitest_1.describe)('classifyDueStatus', () => {
    const now = new Date('2026-03-13T00:00:00.000Z');
    (0, vitest_1.it)('returns OVERDUE for past dates', () => {
        (0, vitest_1.expect)((0, notificationService_1.classifyDueStatus)(new Date('2026-03-12T00:00:00.000Z'), 14, now)).toBe('OVERDUE');
    });
    (0, vitest_1.it)('returns DUE_SOON inside the lead window', () => {
        (0, vitest_1.expect)((0, notificationService_1.classifyDueStatus)(new Date('2026-03-20T00:00:00.000Z'), 14, now)).toBe('DUE_SOON');
    });
    (0, vitest_1.it)('returns UPCOMING outside the lead window', () => {
        (0, vitest_1.expect)((0, notificationService_1.classifyDueStatus)(new Date('2026-04-30T00:00:00.000Z'), 14, now)).toBe('UPCOMING');
    });
});
