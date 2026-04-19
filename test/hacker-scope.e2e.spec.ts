import 'dotenv/config';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from '@jest/globals';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaClient } from '../src/generated/prisma/client';
import { SEED_ADMIN_LOGIN, SEED_ADMIN_PASSWORD } from './setup/seedAdmin';

describe('Hacker scope additional e2e tests', () => {
  var app: INestApplication;
  var server: any;
  var adminToken: string;
  var runId: string;
  var pool: Pool;
  var prisma: PrismaClient;

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
    runId = Date.now().toString();

    var connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    pool = new Pool({ connectionString });
    var adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });

    await prisma.comment.deleteMany({
      where: {
        OR: [
          { content: 'Alpha comment' },
          { content: 'Beta comment' },
          { content: 'Gamma comment' },
        ],
      },
    });

    await prisma.article.deleteMany({
      where: {
        OR: [
          { title: { startsWith: '!!!' } },
          { title: { startsWith: 'Comments article ' } },
        ],
      },
    });

    await prisma.category.deleteMany({
      where: {
        name: { startsWith: '!!!' },
      },
    });

    await prisma.user.deleteMany({
      where: {
        login: { startsWith: '000_' },
      },
    });

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
    await prisma.$disconnect();
    await pool.end();
    await app.close();
  });

  it('GET /category should support pagination and sorting', async () => {
    var beforeResponse = await request(server)
      .get('/category')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        page: 1,
        limit: 100,
        sortBy: 'name',
        order: 'asc',
      })
      .expect(200);

    var totalBefore = beforeResponse.body.total;

    var alphaName = `!!!${runId}-Alpha`;
    var betaName = `!!!${runId}-Beta`;
    var gammaName = `!!!${runId}-Gamma`;

    await request(server)
      .post('/category')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: gammaName,
        description: 'Gamma category',
      })
      .expect(201);

    await request(server)
      .post('/category')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: alphaName,
        description: 'Alpha category',
      })
      .expect(201);

    await request(server)
      .post('/category')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: betaName,
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

    expect(response.body.total).toBe(totalBefore + 3);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(2);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].name).toBe(alphaName);
    expect(response.body.data[1].name).toBe(betaName);
  });

  it('GET /user should support pagination and sorting without returning passwords', async () => {
    var beforeResponse = await request(server)
      .get('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        page: 1,
        limit: 100,
        sortBy: 'login',
        order: 'asc',
      })
      .expect(200);

    var totalBefore = beforeResponse.body.total;

    var alphaLogin = `000_${runId}_alpha`;
    var bravoLogin = `000_${runId}_bravo`;
    var charlieLogin = `000_${runId}_charlie`;

    await request(server)
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        login: charlieLogin,
        password: 'pass-charlie',
      })
      .expect(201);

    await request(server)
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        login: alphaLogin,
        password: 'pass-alpha',
      })
      .expect(201);

    await request(server)
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        login: bravoLogin,
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

    expect(response.body.total).toBe(totalBefore + 3);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(2);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].login).toBe(alphaLogin);
    expect(response.body.data[1].login).toBe(bravoLogin);
    expect(response.body.data[0].password).toBeUndefined();
    expect(response.body.data[1].password).toBeUndefined();
  });

  it('GET /article should support filtering, pagination and sorting', async () => {
    var beforeResponse = await request(server)
      .get('/article')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        status: 'draft',
        page: 1,
        limit: 100,
        sortBy: 'title',
        order: 'asc',
      })
      .expect(200);

    var totalBefore = beforeResponse.body.total;

    var alphaTitle = `!!!${runId}-Alpha draft`;
    var gammaTitle = `!!!${runId}-Gamma draft`;

    await request(server)
      .post('/article')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: gammaTitle,
        content: 'Gamma content',
        status: 'draft',
        tags: ['nodejs'],
      })
      .expect(201);

    await request(server)
      .post('/article')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: alphaTitle,
        content: 'Alpha content',
        status: 'draft',
        tags: ['nodejs'],
      })
      .expect(201);

    await request(server)
      .post('/article')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `!!!${runId}-Beta published`,
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

    expect(response.body.total).toBe(totalBefore + 2);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(2);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].title).toBe(alphaTitle);
    expect(response.body.data[1].title).toBe(gammaTitle);
    expect(response.body.data[0].status).toBe('draft');
    expect(response.body.data[1].status).toBe('draft');
  });

  it('GET /comment should support pagination and sorting for a specific article', async () => {
    var articleResponse = await request(server)
      .post('/article')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Comments article ${runId}`,
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