import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('Worker');
  await NestFactory.createApplicationContext(WorkerModule);

  logger.log('Worker started and processing jobs...');
  logger.log(`Concurrency: ${process.env.WORKER_CONCURRENCY || 5}`);

  process.on('SIGTERM', () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
  });
}

bootstrap();
