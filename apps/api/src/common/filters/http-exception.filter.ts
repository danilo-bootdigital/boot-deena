import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const body =
        typeof exceptionResponse === 'string'
          ? { message: exceptionResponse, statusCode: status }
          : { ...(exceptionResponse as object), statusCode: status };

      this.logger.warn(`HTTP ${status}: ${JSON.stringify(body)}`);
      response.status(status).send(body);
      return;
    }

    // Supabase PostgrestError or generic errors
    const error = exception as Record<string, unknown>;
    const message = error?.message || 'Internal server error';
    const code = error?.code as string | undefined;

    this.logger.error(`Unhandled exception: ${message}`, (exception as Error)?.stack);

    response.status(500).send({
      statusCode: 500,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
      ...(code && process.env.NODE_ENV !== 'production' ? { code } : {}),
    });
  }
}
