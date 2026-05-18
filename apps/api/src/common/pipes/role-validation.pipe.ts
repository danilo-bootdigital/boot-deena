import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const VALID_ROLES = ['owner', 'admin', 'member', 'viewer'];

@Injectable()
export class RoleValidationPipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!VALID_ROLES.includes(value)) {
      throw new BadRequestException(`Invalid role: ${value}. Must be one of: ${VALID_ROLES.join(', ')}`);
    }
    return value;
  }
}
