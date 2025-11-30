import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export interface ApiError extends FastifyError {
  statusCode: number;
  code: string;
  message: string;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  code: string;
  name = 'AppError';

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const errorHandler = (
  error: FastifyError | ZodError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      },
    });
  }

  // Custom app errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  // Fastify errors
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = error.message || 'Internal server error';

  // Log error
  if (statusCode >= 500) {
    logger.error(error, 'Unhandled error');
  } else {
    logger.warn(error, 'Client error');
  }

  return reply.status(statusCode).send({
    error: {
      code,
      message: statusCode >= 500 ? 'Internal server error' : message,
    },
  });
};

