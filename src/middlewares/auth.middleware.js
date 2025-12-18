import { getAuth } from '../config/firebase.js'

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
      const err = new Error('Missing or invalid authorization header')
      err.statusCode = 401
      throw err
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify the token with Firebase
    const auth = getAuth()
    const decodedToken = await auth.verifyIdToken(token)

    // Add user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      customClaims: decodedToken,
    }

    logger.info('User authenticated', {
      uid: decodedToken.uid,
      email: decodedToken.email,
    })

    return await next()
  } catch (error) {
    logger.error('Authentication failed', { error: error.message })

    const err = new Error('Invalid or expired token')
    err.statusCode = 401
    throw err
  }
}

/**
 * Admin auth middleware that verifies user is an admin
 * Must be used after authMiddleware
 */
export const adminAuthMiddleware = async (req, ctx, next) => {
  const { logger } = ctx

  if (!req.user) {
    logger.error('Admin auth middleware called without prior auth')

    const err = new Error('User not authenticated')
    err.statusCode = 401
    throw err
  }

  const isAdmin =
    req.user.customClaims?.admin === true ||
    req.user.customClaims?.role === 'admin'

  if (!isAdmin) {
    logger.warn('User attempted admin access', { uid: req.user.uid })

    const err = new Error('Admin access required')
    err.statusCode = 403
    throw err
  }

  logger.info('Admin access granted', { uid: req.user.uid })
  return await next()
}
