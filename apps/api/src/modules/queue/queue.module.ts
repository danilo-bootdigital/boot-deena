import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@agente-ia/shared';
import { QueueService } from './queue.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.INBOUND },
      { name: QUEUES.OUTBOUND },
      { name: QUEUES.RAG },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
