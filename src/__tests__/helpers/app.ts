import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';

export function createTestApp(): Express {
  const app: Express = express();

  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, '../../views'));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  return app;
}
