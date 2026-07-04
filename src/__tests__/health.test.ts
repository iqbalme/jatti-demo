import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import healthRoutes from '../routes/health';

const app = express();
app.use('/health', healthRoutes);

describe('GET /health', () => {
  it('returns 200 with ok status', async () => {
    const res = await supertest(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
