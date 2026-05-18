import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';

interface FlowStep {
  id: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
  next_step_id: string | null;
  condition_true_step_id: string | null;
  condition_false_step_id: string | null;
}

interface FlowContext {
  conversationId: string;
  organizationId: string;
  agentId: string;
  userMessage: string;
  variables: Record<string, unknown>;
}

export interface FlowResult {
  matched: boolean;
  response?: string;
  handoff?: boolean;
  handoffReason?: string;
}

@Injectable()
export class FlowEngineService {
  private readonly logger = new Logger(FlowEngineService.name);
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('worker.supabaseUrl'),
      this.configService.getOrThrow('worker.supabaseServiceRoleKey'),
    );
  }

  async tryMatchFlow(agentId: string, userMessage: string): Promise<{ flowId: string; steps: FlowStep[] } | null> {
    // Get flows attached to this agent, ordered by priority
    const { data: agentFlows } = await this.supabase
      .from('agent_flows')
      .select('flow_id, priority, flows(id, trigger_keywords, trigger_intent, status)')
      .eq('agent_id', agentId)
      .order('priority', { ascending: false });

    if (!agentFlows || agentFlows.length === 0) return null;

    const messageLower = userMessage.toLowerCase().trim();

    for (const af of agentFlows) {
      const flow = af.flows as unknown as { id: string; trigger_keywords: string[] | null; status: string };
      if (!flow || flow.status !== 'active') continue;

      // Check keyword triggers
      if (flow.trigger_keywords && flow.trigger_keywords.length > 0) {
        const matched = flow.trigger_keywords.some((kw: string) =>
          messageLower.includes(kw.toLowerCase()),
        );

        if (matched) {
          const { data: steps } = await this.supabase
            .from('flow_steps')
            .select('*')
            .eq('flow_id', flow.id)
            .order('position', { ascending: true });

          return { flowId: flow.id, steps: steps || [] };
        }
      }
    }

    return null;
  }

  async executeFlow(steps: FlowStep[], context: FlowContext): Promise<FlowResult> {
    if (steps.length === 0) {
      return { matched: true, response: undefined };
    }

    this.logger.log(`Executing flow with ${steps.length} steps for conversation ${context.conversationId}`);

    let currentStep: FlowStep | undefined = steps[0];
    let response = '';

    const maxIterations = 50;
    let iterations = 0;

    while (currentStep && iterations < maxIterations) {
      iterations++;

      switch (currentStep.type) {
        case 'message': {
          const template = (currentStep.config.message as string) || '';
          response += this.interpolateVariables(template, context.variables) + '\n';
          currentStep = this.getNextStep(steps, currentStep.next_step_id);
          break;
        }

        case 'condition': {
          const conditionMet = this.evaluateCondition(currentStep.config, context);
          const nextId = conditionMet
            ? currentStep.condition_true_step_id
            : currentStep.condition_false_step_id;
          currentStep = this.getNextStep(steps, nextId);
          break;
        }

        case 'set_variable': {
          const varName = currentStep.config.variable_name as string;
          let varValue = currentStep.config.value as string;
          if (varName) {
            if (varValue === '{{user_message}}') {
              varValue = context.userMessage;
            } else if (varValue && varValue.includes('{{')) {
              varValue = this.interpolateVariables(varValue, context.variables);
            }
            context.variables[varName] = varValue || context.userMessage;
          }
          currentStep = this.getNextStep(steps, currentStep.next_step_id);
          break;
        }

        case 'handoff': {
          const reason = (currentStep.config.reason as string) || 'Flow handoff';
          return { matched: true, handoff: true, handoffReason: reason };
        }

        case 'schedule_message': {
          // Agendar mensagem para envio futuro
          const delayMinutes = Number(currentStep.config.delay_minutes) || 60;
          const msgType = (currentStep.config.message_type as string) || 'custom';
          const msgContent = (currentStep.config.message as string) || '';
          const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

          // Buscar dados da conversa para agendar
          const { data: conversation } = await this.supabase
            .from('conversations')
            .select('contact_phone, instance_name')
            .eq('id', context.conversationId)
            .single();

          if (conversation) {
            await this.supabase
              .from('scheduled_messages')
              .insert({
                organization_id: context.organizationId,
                conversation_id: context.conversationId,
                agent_id: context.agentId,
                contact_phone: conversation.contact_phone,
                instance_name: conversation.instance_name,
                message_type: msgType,
                content: this.interpolateVariables(msgContent, context.variables),
                variables: context.variables,
                scheduled_for: scheduledFor,
                status: 'pending',
              });
          }

          currentStep = this.getNextStep(steps, currentStep.next_step_id);
          break;
        }

        case 'wait': {
          // Wait step ends flow execution, response sent so far
          return { matched: true, response: response.trim() || undefined };
        }

        case 'tool_call': {
          // Tool calls are handled by the AI engine
          currentStep = this.getNextStep(steps, currentStep.next_step_id);
          break;
        }

        default:
          currentStep = this.getNextStep(steps, currentStep.next_step_id);
      }
    }

    return { matched: true, response: response.trim() || undefined };
  }

  private getNextStep(steps: FlowStep[], nextId: string | null): FlowStep | undefined {
    if (!nextId) return undefined;
    return steps.find((s) => s.id === nextId);
  }

  private interpolateVariables(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(variables[key] ?? `{{${key}}}`);
    });
  }

  private evaluateCondition(config: Record<string, unknown>, context: FlowContext): boolean {
    const field = config.field as string;
    const operator = config.operator as string;
    const value = config.value;

    let fieldValue: unknown;
    if (field === 'user_message') {
      fieldValue = context.userMessage;
    } else {
      fieldValue = context.variables[field];
    }

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'contains': {
        const fieldStr = String(fieldValue || '').toLowerCase();
        const values = String(value).split(',').map((v) => v.trim().toLowerCase());
        return values.some((v) => v && fieldStr.includes(v));
      }
      case 'not_empty':
        return !!fieldValue;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      default:
        return false;
    }
  }
}
