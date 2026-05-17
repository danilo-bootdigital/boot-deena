import { z } from 'zod';

const flowStepSchema = z.object({
  type: z.enum(['message', 'condition', 'tool_call', 'handoff', 'wait', 'set_variable']),
  position: z.number().int().min(0),
  config: z.record(z.string(), z.unknown()).default({}),
  next_step_id: z.string().uuid().optional(),
  condition_true_step_id: z.string().uuid().optional(),
  condition_false_step_id: z.string().uuid().optional(),
});

export const createFlowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  trigger_keywords: z.array(z.string()).optional(),
  trigger_intent: z.string().optional(),
  steps: z.array(flowStepSchema).optional(),
});

export const updateFlowSchema = createFlowSchema.partial();

export type CreateFlowDto = z.infer<typeof createFlowSchema>;
export type UpdateFlowDto = z.infer<typeof updateFlowSchema>;
