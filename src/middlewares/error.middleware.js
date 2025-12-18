import { UnauthorizedError } from '../errors/unauthorized.error.js'
import { ForbiddenError } from '../errors/forbidden.error.js'

export const errorMiddleware = async (error, req, ctx) => {
  const { logger } = ctx

  // Fall back to generic 500 error
  let statusCode = 500
  let message = 'Internal Server Error'

  if (error instanceof UnauthorizedError) {
    statusCode = error.statusCode
    message = error.message
  } else if (error instanceof ForbiddenError) {
    statusCode = error.statusCode
    message = error.message
  }

  logger.error('Request failed', {
    statusCode,
    message,
    error: error.stack,
    path: req.url,
    method: req.method,
  })

  return {
    status: statusCode,
    body: {
      success: false,
      error: {
        message,
        code: statusCode,
      },
    },
  }
}
