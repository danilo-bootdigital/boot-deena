import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

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

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Requires role: ${requiredRoles.join(' or ')}. Your role: ${userRole}`,
      );
    }

    return true;
  }
}
