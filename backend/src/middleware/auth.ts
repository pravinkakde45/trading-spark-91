import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: number;
    email: string;
  };
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
    // User is now available on request.user after jwtVerify
    // TypeScript will recognize it due to the AuthenticatedRequest interface
  } catch (err) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or missing token');
  }
}

