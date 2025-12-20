import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

export const config = {
  name: 'AdminGetIngredients',
  type: 'api',
  path: '/api/admin/ingredients',
  method: 'GET',
  description: 'Get all ingredients (Admin only)',
  emits: [],
  flows: ['ingredient-management'],
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    adminAuthMiddleware,
    errorMiddleware,
  ],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      ingredients: z.array(
        z.object({
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

export const handler = async (req, { logger, db }) => {
  logger.info('Fetching all ingredients', {
    admin: req.user.uid,
  })

  const ingredientsRef = db.collection('ingredients')
  const snapshot = await ingredientsRef.get()

  if (snapshot.empty) {
    logger.warn('No ingredients found')

    return {
      status: 200,
      body: {
        success: true,
        ingredients: [],
        total: 0,
      },
    }
  }

  const ingredients = snapshot.docs.map(doc => ({
    ...doc.data(),
  }))

  ingredients.sort((a, b) => a.name.localeCompare(b.name))

  logger.info('Ingredients fetched successfully', {
    count: ingredients.length,
  })

  return {
    status: 200,
    body: {
      success: true,
      ingredients,
      total: ingredients.length,
    },
  }
}
