import { Module } from '@nestjs/common';
import { AccessLevelsController } from './access-levels.controller';
import { AccessLevelsService } from './access-levels.service';

@Module({
  controllers: [AccessLevelsController],
  providers: [AccessLevelsService],
  exports: [AccessLevelsService],
})
export class AccessLevelsModule {}
