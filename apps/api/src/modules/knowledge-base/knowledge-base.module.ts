import { Module } from '@nestjs/common';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [QueueModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
