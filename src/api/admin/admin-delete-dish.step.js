import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

export const config = {
  name: 'AdminDeleteDish',
  type: 'api',
  path: '/api/admin/dishes/:dishId',
  method: 'DELETE',
  description: 'Delete a dish (Admin only)',
  emits: ['dish.deleted'],
  flows: ['dish-management'],
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    adminAuthMiddleware,
    errorMiddleware,
  ],
}

export const handler = async (req, { logger, db }) => {
  const dishName = req.pathParams.dishId
  const { uid } = req.user

  logger.info('Deleting dish by name', {
    dishName,
    admin: uid,
  })

  const snapshot = await db
    .collection('dishes')
    .where('name', '==', dishName)
    .limit(1)
    .get()

  if (snapshot.empty) {
    logger.warn('Dish not found', { dishName })
    return {
      status: 404,
      body: { success: false, message: 'Dish not found' },
    }
  }

  const docRef = snapshot.docs[0].ref

  logger.info('Deleting Firestore dish document', {
    docId: docRef.id,
    dishName,
  })

  await docRef.delete()

  logger.warn('Dish deleted successfully', {
    dishName,
    docId: docRef.id,
    admin: uid,
  })

  return {
    status: 200,
    body: {
      success: true,
      message: 'Dish deleted successfully',
    },
  }
}
