import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

const bodySchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  quantity: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
})

export const config = {
  name: 'AdminUpdateIngredient',
  type: 'api',
  path: '/api/admin/ingredients/:ingredientId', 
  method: 'PUT',
  description: 'Update an ingredient (Admin only)',
  flows: ['ingredient-management'],
  emits: ['ingredient.updated'],
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    adminAuthMiddleware,
    errorMiddleware,
  ],
  bodySchema,
}

export const handler = async (req, { logger, db }) => {
  const ingredientName = req.pathParams.ingredientId
  const updateData = bodySchema.parse(req.body)
  const { uid } = req.user

  logger.info('Updating ingredient by name', {
    ingredientName,
    updateFields: Object.keys(updateData),
    admin: uid,
  })

  const snapshot = await db
    .collection('ingredients')
    .where('name', '==', ingredientName)
    .limit(1)
    .get()

  if (snapshot.empty) {
    logger.warn('Ingredient not found', { ingredientName })
    return {
      status: 404,
      body: { success: false, message: 'Ingredient not found' },
    }
  }

  const docRef = snapshot.docs[0].ref

  logger.info('Updating Firestore ingredient document', {
    docId: docRef.id,
    ingredientName,
  })

  await docRef.update({
    ...updateData,
    updatedAt: new Date().toISOString(),
    updatedBy: uid,
  })

  logger.info('Ingredient updated successfully', {
    ingredientName,
    docId: docRef.id,
    admin: uid,
  })

  return {
    status: 200,
    body: {
      success: true,
      message: 'Ingredient updated successfully',
    },
  }
}
