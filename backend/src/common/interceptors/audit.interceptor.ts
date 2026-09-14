import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const user = request.user;

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const entityType = context.getClass().name.replace('Controller', '');
    const action =
      method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE';

    return next.handle().pipe(
      tap((result) => {
        this.prisma.auditLog
          .create({
            data: {
              userId: user?.userId,
              action,
              entityType,
              entityId: result?.id || 'n/a',
              after: result ? JSON.parse(JSON.stringify(result)) : undefined,
              ipAddress: request.ip,
            },
          })
          .catch(() => undefined);
      }),
    );
  }
}
