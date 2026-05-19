import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Hierarquia de roles — maior número = mais permissão
const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 1,
  attendant: 2,
  operator: 2, // alias legado
  manager: 3,
  company_admin: 4,
  admin: 4, // alias legado
  owner: 5,
  master_admin: 6,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Roles decorator, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRole = request.orgRole;

    if (!userRole) {
      throw new ForbiddenException('No organization role found');
    }

    // Verificar se o role do usuário tem nível suficiente
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const hasAccess = requiredRoles.some(
      (required) => userLevel >= (ROLE_HIERARCHY[required] || 0),
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        `Requires role: ${requiredRoles.join(' or ')}. Your role: ${userRole}`,
      );
    }

    return true;
  }
}
