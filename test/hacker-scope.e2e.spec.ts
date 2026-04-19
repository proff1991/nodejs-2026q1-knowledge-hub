import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { SEED_ADMIN_LOGIN, SEED_ADMIN_PASSWORD } from './setup/seedAdmin';

describe('Hacker scope additional e2e tests', () => {
  var app: INestApplication;
  var server: any;
  var adminToken: string;

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

    var loginResponse = await request(server)
      .post('/auth/login')
      .send({
        login: SEED_ADMIN_LOGIN,
        password: SEED_ADMIN_PASSWORD,
      })
      .expect(200);

    adminToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /category should support pagination and sorting', async () => {
    await request(server)
      .post('/category')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Gamma',
        description: 'Gamma category',
      })
      .expect(201);

    await request(server)
      .post('/category')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Alpha',
        description: 'Alpha category',
      })
      .expect(201);

    await request(server)
      .post('/category')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Beta',
        description: 'Beta category',
      })
      .expect(201);

    var response = await request(server)
      .get('/category')
      .set('Authorization', `Bearer ${adminToken}`)
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
    await request(server)
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        login: 'charlie',
        password: 'pass-charlie',
      })
      .expect(201);

    await request(server)
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        login: 'alpha',
        password: 'pass-alpha',
      })
      .expect(201);

    await request(server)
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        login: 'bravo',
        password: 'pass-bravo',
      })
      .expect(201);

    var response = await request(server)
      .get('/user')
      .set('Authorization', `Bearer ${adminToken}`)
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
    await request(server)
      .post('/article')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Gamma draft',
        content: 'Gamma content',
        status: 'draft',
        tags: ['nodejs'],
      })
      .expect(201);

    await request(server)
      .post('/article')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Alpha draft',
        content: 'Alpha content',
        status: 'draft',
        tags: ['nodejs'],
      })
      .expect(201);

    await request(server)
      .post('/article')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Beta published',
        content: 'Beta content',
        status: 'published',
        tags: ['nestjs'],
      })
      .expect(201);

    var response = await request(server)
      .get('/article')
      .set('Authorization', `Bearer ${adminToken}`)
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
    var articleResponse = await request(server)
      .post('/article')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Comments article',
        content: 'Comments content',
      })
      .expect(201);

    var articleId = articleResponse.body.id;

    await request(server)
      .post('/comment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        content: 'Gamma comment',
        articleId,
      })
      .expect(201);

    await request(server)
      .post('/comment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        content: 'Alpha comment',
        articleId,
      })
      .expect(201);

    await request(server)
      .post('/comment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        content: 'Beta comment',
        articleId,
      })
      .expect(201);

    var response = await request(server)
      .get('/comment')
      .set('Authorization', `Bearer ${adminToken}`)
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
    await request(server)
      .get('/comment')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});