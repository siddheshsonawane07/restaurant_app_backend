import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

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
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    adminAuthMiddleware,
    errorMiddleware,
  ],
  bodySchema,
}

export const handler = async (req, { emit, logger, db }) => {
  const ingredientData = bodySchema.parse(req.body)
  const { uid } = req.user

  logger.info('Adding ingredient', {
    ingredientName: ingredientData.name,
    admin: uid,
  })

  const ingredientsRef = db.collection('ingredients')

  const existingIngredient = await ingredientsRef
    .where('name', '==', ingredientData.name)
    .limit(1)
    .get()

  if (!existingIngredient.empty) {
    logger.warn('Ingredient already exists', {
      ingredientName: ingredientData.name,
    })

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

  logger.info('Ingredient created successfully', {
    docId: docRef.id,
    ingredientName: newIngredient.name,
  })

  await emit({
    topic: 'ingredient.created',
    data: {
      ingredientName: newIngredient.name,
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
        name: newIngredient.name,
        unit: newIngredient.unit,
        quantity: newIngredient.quantity,
        createdAt: newIngredient.createdAt,
      },
    },
  }
}
