import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantFilterData {
  allAccess: boolean;
  agentIds: string[] | null;
  whatsappInstanceIds: string[] | null;
  pipeline: {
    can_view: boolean;
    can_move: boolean;
    can_create: boolean;
    can_delete: boolean;
  };
}

export const GetTenantFilter = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantFilterData => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantFilter || {
      allAccess: true,
      agentIds: null,
      whatsappInstanceIds: null,
      pipeline: { can_view: true, can_move: true, can_create: true, can_delete: true },
    };
  },
);
