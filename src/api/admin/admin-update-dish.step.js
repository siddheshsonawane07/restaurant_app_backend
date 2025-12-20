import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  category: z.string().min(1).optional(),
  preparationTime: z.number().min(0).optional(),
  imageUrl: z.string().url().optional(),
  available: z.boolean().optional(),
})

export const config = {
  name: 'AdminUpdateDish',
  type: 'api',
  path: '/api/admin/dishes/:dishId', 
  method: 'PUT',
  description: 'Update a dish (Admin only)',
  flows: ['dish-management'],
  emits: ['dish.updated'],
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    adminAuthMiddleware,
    errorMiddleware,
  ],
  bodySchema,
}

export const handler = async (req, { logger, db }) => {
  const dishName = req.pathParams.dishId
  const updateData = bodySchema.parse(req.body)
  const { uid } = req.user

  logger.info('Updating dish by name', {
    dishName,
    updateFields: Object.keys(updateData),
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

  logger.info('Updating Firestore dish document', {
    docId: docRef.id,
    dishName,
  })

  await docRef.update({
    ...updateData,
    updatedAt: new Date().toISOString(),
    updatedBy: uid,
  })

  logger.info('Dish updated successfully', {
    dishName,
    docId: docRef.id,
    admin: uid,
  })

  return {
    status: 200,
    body: {
      success: true,
      message: 'Dish updated successfully',
    },
  }
}
