import { getAuth } from '../config/firebase.js'
import { UnauthorizedError } from '../errors/unauthorized.error.js'
import { ForbiddenError } from '../errors/forbidden.error.js'

/**
 * Auth middleware that verifies Firebase token
 * Adds user info to request
 */
export const authMiddleware = async (req, ctx, next) => {
  const { logger } = ctx

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header')
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify the token with Firebase
    const auth = getAuth()
    const decodedToken = await auth.verifyIdToken(token)

    // Add user info to request for use in handler
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      customClaims: decodedToken,
    }

    logger.info('User authenticated', { uid: decodedToken.uid, email: decodedToken.email })

    return await next()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error
    }

    logger.error('Authentication failed', { error: error.message })
    throw new UnauthorizedError('Invalid or expired token')
  }
}

/**
 * Admin auth middleware that verifies user is an admin
 * Must be used after authMiddleware
 */
export const adminAuthMiddleware = async (req, ctx, next) => {
  const { logger } = ctx

  // Check if user was added by authMiddleware
  if (!req.user) {
    logger.error('Admin auth middleware called without prior auth')
    throw new UnauthorizedError('User not authenticated')
  }

  // Check if user has admin custom claim
  const isAdmin = req.user.customClaims?.admin === true || req.user.customClaims?.role === 'admin'

  if (!isAdmin) {
    logger.warn('User attempted admin access', { uid: req.user.uid })
    throw new ForbiddenError('Admin access required')
  }

  logger.info('Admin access granted', { uid: req.user.uid })
  return await next()
}
