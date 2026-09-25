import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from '../../support/test-app';

describe('GET /health and GET /ready (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should answer 200 UP when the process is alive', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'UP' });
  });

  it('should answer 200 UP when the database is reachable', async () => {
    await request(app.getHttpServer()).get('/ready').expect(200).expect({ status: 'UP' });
  });

  it('should expose the request id header when a request is handled', async () => {
    const response = await request(app.getHttpServer()).get('/health').set('x-request-id', 'req-123');

    expect(response.headers['x-request-id']).toBe('req-123');
  });

  it('should answer a Problem Details 404 when the route does not exist', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({
      type: 'https://oficina.local/errors/not-found',
      title: 'Recurso não encontrado',
      status: 404,
      instance: '/api/v1/does-not-exist',
    });
    expect(response.body.requestId).toEqual(expect.any(String));
  });

  it('should answer a Problem Details 400 when the JSON body is malformed', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/does-not-exist')
      .set('Content-Type', 'application/json')
      .send('{"broken":')
      .expect(400);

    expect(response.body).toMatchObject({
      type: 'https://oficina.local/errors/bad-request',
      title: 'Requisição inválida',
      status: 400,
      detail: 'JSON malformado',
    });
  });

  it('should not expose the x-powered-by header when a request is handled', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
