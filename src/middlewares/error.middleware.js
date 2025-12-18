import { ZodError } from 'zod';
 
export const errorMiddleware = async (req, ctx, next) => {
  try {
    return await next()
  } catch (error) {
    if (error instanceof ZodError) {
      ctx.logger.error('Validation error', { errors: error.errors })
      return { status: 400, body: { error: 'Validation failed' } }
    }
 
    ctx.logger.error('Unexpected error', { error: error.message })
    return { status: 500, body: { error: 'Internal server error' } }
  }
}

