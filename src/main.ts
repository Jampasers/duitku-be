import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Duitku callback can be x-www-form-urlencoded
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.enableCors({
    origin: process.env.PUBLIC_APP_URL || true,
  });

  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
}
bootstrap();
