import { Module } from '@nestjs/common';
import { AgentMembersController, MyAgentsController } from './agent-members.controller';
import { AgentMembersService } from './agent-members.service';

@Module({
  controllers: [AgentMembersController, MyAgentsController],
  providers: [AgentMembersService],
  exports: [AgentMembersService],
})
export class AgentMembersModule {}
