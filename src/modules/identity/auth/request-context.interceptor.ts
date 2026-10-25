import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthenticatedRequest } from './auth.types';
import { RequestContext } from './request-context';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly context: RequestContext) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const { user } = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    // O handler só executa ao assinar o Observable, então a assinatura precisa ficar dentro do run.
    return new Observable((subscriber) =>
      this.context.run(user, () => next.handle().subscribe(subscriber)),
    );
  }
}
