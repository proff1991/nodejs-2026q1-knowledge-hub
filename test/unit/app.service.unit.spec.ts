import { describe, expect, it } from 'vitest';
import { AppService } from '../../src/app.service';

describe('AppService', () => {
    it('should return API status message', () => {
        var service = new AppService();

        expect(service.getHello()).toBe('Hello World!');
    });
});