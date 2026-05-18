import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '@agente-ia/shared';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule);

  // Registrar job recorrente para processar mensagens agendadas (a cada 60s)
  try {
    const scheduledQueue = app.get<Queue>(getQueueToken(QUEUES.SCHEDULED));
    await scheduledQueue.add(
      'process-pending',
      { type: 'process_pending' },
      {
        repeat: { every: 60000 },
        removeOnComplete: true,
        removeOnFail: 5,
      },
    );
    logger.log('Scheduled messages repeatable job registered (every 60s)');
  } catch (err) {
    logger.warn(`Could not register scheduled messages job: ${(err as Error).message}`);
  }

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
