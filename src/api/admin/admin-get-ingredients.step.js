import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'

export const config = {
  name: 'AdminGetIngredients',
  type: 'api',
  path: '/api/admin/ingredients',
  method: 'GET',
  description: 'Get all ingredients (Admin only)',
  emits: [],
  flows: ['ingredient-management'],
  middleware: [errorMiddleware, authMiddleware, adminAuthMiddleware],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      ingredients: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          unit: z.string(),
          quantity: z.number(),
          reorderLevel: z.number().optional(),
          cost: z.number().optional(),
          createdAt: z.string(),
          updatedAt: z.string(),
        })
      ),
      total: z.number(),
    }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
  },
}

export const handler = async (req, { logger }) => {
  try {
    logger.info('Fetching all ingredients', { admin: req.user.uid })

    // Import Firebase Admin
    const admin = await import('firebase-admin')
    const db = admin.firestore()
    const ingredientsRef = db.collection('ingredients')

    const snapshot = await ingredientsRef.orderBy('name', 'asc').get()

    const ingredients = []
    snapshot.forEach((doc) => {
      ingredients.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    logger.info('Ingredients fetched successfully', { count: ingredients.length })

    return {
      status: 200,
      body: {
        success: true,
        ingredients,
        total: ingredients.length,
      },
    }
  } catch (error) {
    logger.error('Failed to fetch ingredients', { error: error.message })
    throw error
  }
}
