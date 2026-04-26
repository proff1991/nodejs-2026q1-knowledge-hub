import { ArgumentMetadata, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

describe('UUID validation pipe', () => {
    var metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id',
    };

    it('should pass valid UUID v4', async () => {
        var pipe = new ParseUUIDPipe({
            version: '4',
        });

        var validUuid = '550e8400-e29b-41d4-a716-446655440000';

        await expect(pipe.transform(validUuid, metadata)).resolves.toBe(validUuid);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
        var pipe = new ParseUUIDPipe({
            version: '4',
        });

        await expect(pipe.transform('not-uuid', metadata)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('should throw BadRequestException for UUID with wrong version', async () => {
        var pipe = new ParseUUIDPipe({
            version: '4',
        });

        var uuidV1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

        await expect(pipe.transform(uuidV1, metadata)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('should throw BadRequestException for empty string', async () => {
        var pipe = new ParseUUIDPipe({
            version: '4',
        });

        await expect(pipe.transform('', metadata)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });
});