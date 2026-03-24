"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const auth_1 = require("../src/middleware/auth");
const createResponse = () => {
    const res = {};
    res.status = vitest_1.vi.fn().mockReturnValue(res);
    res.json = vitest_1.vi.fn().mockReturnValue(res);
    return res;
};
(0, vitest_1.describe)('enforceWriteAccess', () => {
    (0, vitest_1.it)('allows read methods for viewer accounts', () => {
        const req = { method: 'GET', user: { id: '1', username: 'viewer', role: 'VIEWER' } };
        const res = createResponse();
        const next = vitest_1.vi.fn();
        (0, auth_1.enforceWriteAccess)(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledOnce();
        (0, vitest_1.expect)(res.status).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('blocks write methods for viewer accounts', () => {
        const req = { method: 'POST', user: { id: '1', username: 'viewer', role: 'VIEWER' } };
        const res = createResponse();
        const next = vitest_1.vi.fn();
        (0, auth_1.enforceWriteAccess)(req, res, next);
        (0, vitest_1.expect)(next).not.toHaveBeenCalled();
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(403);
    });
});
(0, vitest_1.describe)('authorizeRole', () => {
    (0, vitest_1.it)('allows matching roles', () => {
        const req = { user: { id: '1', username: 'admin', role: 'ADMIN' } };
        const res = createResponse();
        const next = vitest_1.vi.fn();
        (0, auth_1.authorizeRole)(['ADMIN'])(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalledOnce();
    });
    (0, vitest_1.it)('blocks non-matching roles', () => {
        const req = { user: { id: '1', username: 'viewer', role: 'VIEWER' } };
        const res = createResponse();
        const next = vitest_1.vi.fn();
        (0, auth_1.authorizeRole)(['ADMIN'])(req, res, next);
        (0, vitest_1.expect)(next).not.toHaveBeenCalled();
        (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(403);
    });
});
