import { getFirestore } from '../config/firebase.js'

export const firebaseMiddleware = async (req, ctx, next) => {
  const { logger } = ctx

  try {
    // Attach Firestore to context
    ctx.db = getFirestore()

    logger.debug('Firebase initialized')
    return await next()
  } catch (error) {
    logger.error('Firebase initialization failed', { error })
    throw error
  }
}
