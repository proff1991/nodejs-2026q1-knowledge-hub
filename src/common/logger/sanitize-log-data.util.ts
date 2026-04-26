var sensitiveKeys = [
    'password',
    'oldpassword',
    'old_password',
    'newpassword',
    'new_password',
    'token',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'authorization',
    'cookie',
    'set-cookie',
];

var redactedValue = '[REDACTED]';

var isSensitiveKey = (key: string): boolean =>
    sensitiveKeys.includes(key.toLowerCase());

export var sanitizeLogData = (data: unknown): unknown => {
    if (Array.isArray(data)) {
        return data.map((item) => sanitizeLogData(item));
    }

    if (data instanceof Date) {
        return data;
    }

    if (data !== null && typeof data === 'object') {
        var sanitizedData: Record<string, unknown> = {};

        Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
            if (isSensitiveKey(key)) {
                sanitizedData[key] = redactedValue;

                return;
            }

            sanitizedData[key] = sanitizeLogData(value);
        });

        return sanitizedData;
    }

    return data;
};