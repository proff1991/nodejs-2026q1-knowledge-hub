import { describe, expect, it } from 'vitest';
import { sanitizeLogData } from '../../../src/common/logger/sanitize-log-data.util';

describe('sanitizeLogData', () => {
    it('should redact sensitive root fields', () => {
        var result = sanitizeLogData({
            login: 'alex',
            password: 'secret',
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            authorization: 'Bearer token',
        });

        expect(result).toEqual({
            login: 'alex',
            password: '[REDACTED]',
            accessToken: '[REDACTED]',
            refreshToken: '[REDACTED]',
            authorization: '[REDACTED]',
        });
    });

    it('should redact sensitive fields case-insensitively', () => {
        var result = sanitizeLogData({
            Password: 'secret',
            ACCESS_TOKEN: 'access-token',
            RefreshToken: 'refresh-token',
        });

        expect(result).toEqual({
            Password: '[REDACTED]',
            ACCESS_TOKEN: '[REDACTED]',
            RefreshToken: '[REDACTED]',
        });
    });

    it('should redact nested sensitive fields', () => {
        var result = sanitizeLogData({
            user: {
                login: 'alex',
                password: 'secret',
            },
            auth: {
                token: 'token-value',
            },
        });

        expect(result).toEqual({
            user: {
                login: 'alex',
                password: '[REDACTED]',
            },
            auth: {
                token: '[REDACTED]',
            },
        });
    });

    it('should redact sensitive fields inside arrays', () => {
        var result = sanitizeLogData([
            {
                login: 'alex',
                password: 'secret',
            },
            {
                login: 'john',
                refreshToken: 'refresh-token',
            },
        ]);

        expect(result).toEqual([
            {
                login: 'alex',
                password: '[REDACTED]',
            },
            {
                login: 'john',
                refreshToken: '[REDACTED]',
            },
        ]);
    });

    it('should keep primitive values unchanged', () => {
        expect(sanitizeLogData('text')).toBe('text');
        expect(sanitizeLogData(123)).toBe(123);
        expect(sanitizeLogData(null)).toBeNull();
        expect(sanitizeLogData(undefined)).toBeUndefined();
    });

    it('should keep Date instances unchanged', () => {
        var date = new Date('2026-04-26T00:00:00.000Z');

        expect(sanitizeLogData(date)).toBe(date);
    });
});