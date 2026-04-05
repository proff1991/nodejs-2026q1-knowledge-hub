import {
    afterAll
    , beforeAll
    , describe
    , expect
    , it
} from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';

describe('Hacker scope additional e2e tests', () => {
    var app: INestApplication;
    var server: any;

    beforeAll(async () => {
        var moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                transform: true,
                forbidNonWhitelisted: true,
            }),
        );

        await app.init();
        server = app.getHttpServer();
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /category should support pagination and sorting', async () => {
        await request(server).post('/category').send({
            name: 'Gamma',
            description: 'Gamma category',
        });

        await request(server).post('/category').send({
            name: 'Alpha',
            description: 'Alpha category',
        });

        await request(server).post('/category').send({
            name: 'Beta',
            description: 'Beta category',
        });

        var response = await request(server)
            .get('/category')
            .query({
                page: 1,
                limit: 2,
                sortBy: 'name',
                order: 'asc',
            })
            .expect(200);

        expect(response.body.total).toBe(3);
        expect(response.body.page).toBe(1);
        expect(response.body.limit).toBe(2);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].name).toBe('Alpha');
        expect(response.body.data[1].name).toBe('Beta');
    });

    it('GET /user should support pagination and sorting without returning passwords', async () => {
        await request(server).post('/user').send({
            login: 'charlie',
            password: 'pass-charlie',
        });

        await request(server).post('/user').send({
            login: 'alpha',
            password: 'pass-alpha',
        });

        await request(server).post('/user').send({
            login: 'bravo',
            password: 'pass-bravo',
        });

        var response = await request(server)
            .get('/user')
            .query({
                page: 1,
                limit: 2,
                sortBy: 'login',
                order: 'asc',
            })
            .expect(200);

        expect(response.body.total).toBe(3);
        expect(response.body.page).toBe(1);
        expect(response.body.limit).toBe(2);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].login).toBe('alpha');
        expect(response.body.data[1].login).toBe('bravo');
        expect(response.body.data[0].password).toBeUndefined();
        expect(response.body.data[1].password).toBeUndefined();
    });

    it('GET /article should support filtering, pagination and sorting', async () => {
        await request(server).post('/article').send({
            title: 'Gamma draft',
            content: 'Gamma content',
            status: 'draft',
            tags: ['nodejs'],
        });

        await request(server).post('/article').send({
            title: 'Alpha draft',
            content: 'Alpha content',
            status: 'draft',
            tags: ['nodejs'],
        });

        await request(server).post('/article').send({
            title: 'Beta published',
            content: 'Beta content',
            status: 'published',
            tags: ['nestjs'],
        });

        var response = await request(server)
            .get('/article')
            .query({
                status: 'draft',
                page: 1,
                limit: 2,
                sortBy: 'title',
                order: 'asc',
            })
            .expect(200);

        expect(response.body.total).toBe(2);
        expect(response.body.page).toBe(1);
        expect(response.body.limit).toBe(2);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].title).toBe('Alpha draft');
        expect(response.body.data[1].title).toBe('Gamma draft');
        expect(response.body.data[0].status).toBe('draft');
        expect(response.body.data[1].status).toBe('draft');
    });

    it('GET /comment should support pagination and sorting for a specific article', async () => {
        var articleResponse = await request(server).post('/article').send({
            title: 'Comments article',
            content: 'Comments content',
        });

        var articleId = articleResponse.body.id;

        await request(server).post('/comment').send({
            content: 'Gamma comment',
            articleId,
        });

        await request(server).post('/comment').send({
            content: 'Alpha comment',
            articleId,
        });

        await request(server).post('/comment').send({
            content: 'Beta comment',
            articleId,
        });

        var response = await request(server)
            .get('/comment')
            .query({
                articleId,
                page: 1,
                limit: 2,
                sortBy: 'content',
                order: 'asc',
            })
            .expect(200);

        expect(response.body.total).toBe(3);
        expect(response.body.page).toBe(1);
        expect(response.body.limit).toBe(2);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].content).toBe('Alpha comment');
        expect(response.body.data[1].content).toBe('Beta comment');
    });

    it('GET /comment should fail without required articleId', async () => {
        await request(server).get('/comment').expect(400);
    });
});