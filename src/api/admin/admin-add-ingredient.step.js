import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'

const bodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().min(0, 'Quantity must be non-negative'),
  reorderLevel: z.number().min(0, 'Reorder level must be non-negative').optional(),
  cost: z.number().min(0, 'Cost must be non-negative').optional(),
})

export const config = {
  name: 'AdminAddIngredient',
  type: 'api',
  path: '/api/admin/ingredients',
  method: 'POST',
  description: 'Add a new ingredient (Admin only)',
  emits: ['ingredient.created'],
  flows: ['ingredient-management'],
  middleware: [authMiddleware, adminAuthMiddleware, errorMiddleware],
  bodySchema,
  responseSchema: {
    201: z.object({
      success: z.boolean(),
      ingredient: z.object({
        id: z.string(),
        name: z.string(),
        unit: z.string(),
        quantity: z.number(),
        createdAt: z.string(),
      }),
    }),
    400: z.object({
      error: z.string(),
      details: z.array(z.any()).optional(),
    }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
  },
}

export const handler = async (req, { emit, logger, db }) => {
  const ingredientData = bodySchema.parse(req.body)
  const { uid } = req.user

  logger.info('Adding ingredient', { name: ingredientData.name, admin: uid })

  const ingredientsRef = db.collection('ingredients')

  const existingIngredient = await ingredientsRef
    .where('name', '==', ingredientData.name)
    .limit(1)
    .get()

  if (!existingIngredient.empty) {
    logger.warn('Ingredient already exists', { name: ingredientData.name })
    return {
      status: 400,
      body: { error: 'Ingredient with this name already exists' },
    }
  }

  const newIngredient = {
    ...ingredientData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: uid,
  }

  const docRef = await ingredientsRef.add(newIngredient)

  logger.info('Ingredient created successfully', { id: docRef.id, name: ingredientData.name })

  await emit({
    topic: 'ingredient.created',
    data: {
      ingredientId: docRef.id,
      name: newIngredient.name,
      quantity: newIngredient.quantity,
      unit: newIngredient.unit,
      createdBy: uid,
      timestamp: new Date().toISOString(),
    },
  })

  return {
    status: 201,
    body: {
      success: true,
      ingredient: {
        id: docRef.id,
        name: newIngredient.name,
        unit: newIngredient.unit,
        quantity: newIngredient.quantity,
        createdAt: newIngredient.createdAt,
      },
    },
  }
}