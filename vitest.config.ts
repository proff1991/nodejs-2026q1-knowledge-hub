import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./test/vitest.setup.ts'],
        include: ['test/unit/**/*.unit.spec.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            reportsDirectory: './coverage/unit',
            include: ['src/**/*.ts'],
            exclude: [
                'src/main.ts',
                'src/**/*.module.ts',
                'src/generated/**',
                'src/**/*.spec.ts',
                'test/**',
            ],
            thresholds: {
                lines: 90,
                branches: 85,
            },
        },
    },
});