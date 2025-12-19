import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

const bodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be non-negative'),
  category: z.string().min(1, 'Category is required'),
  ingredients: z.array(
    z.object({
      ingredientId: z.string(),
      quantity: z.number().min(0),
    })
  ),
  preparationTime: z.number().min(0).optional(),
  available: z.boolean().default(true),
  imageUrl: z.string().url().optional(),
})

export const config = {
  name: 'AdminAddDish',
  type: 'api',
  path: '/api/admin/dishes',
  method: 'POST',
  description: 'Add a new dish (Admin only)',
  emits: ['dish.created'],
  flows: ['dish-management'],
  middleware: [firebaseMiddleware, authMiddleware, adminAuthMiddleware, errorMiddleware],
  bodySchema,
  responseSchema: {
    201: z.object({
      success: z.boolean(),
      dish: z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        category: z.string(),
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
  const dishData = bodySchema.parse(req.body)
  const { uid } = req.user

  logger.info('Adding dish', { name: dishData.name, admin: uid })

  const dishesRef = db.collection('dishes')
  const ingredientsRef = db.collection('ingredients')

  const ingredientChecks = await Promise.all(
    dishData.ingredients.map(async (ing) => {
      const doc = await ingredientsRef.doc(ing.ingredientId).get()
      return { id: ing.ingredientId, exists: doc.exists }
    })
  )

  const missingIngredients = ingredientChecks.filter((check) => !check.exists)
  if (missingIngredients.length > 0) {
    const missingIds = missingIngredients.map((ing) => ing.id).join(', ')
    logger.warn('Some ingredients do not exist', { missingIds })
    return {
      status: 400,
      body: { error: `Ingredients not found: ${missingIds}` },
    }
  }

  const existingDish = await dishesRef
    .where('name', '==', dishData.name)
    .limit(1)
    .get()

  if (!existingDish.empty) {
    logger.warn('Dish already exists', { name: dishData.name })
    return {
      status: 400,
      body: { error: 'Dish with this name already exists' },
    }
  }

  const newDish = {
    ...dishData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: uid,
  }

  const docRef = await dishesRef.add(newDish)

  logger.info('Dish created successfully', { id: docRef.id, name: dishData.name })

  await emit({
    topic: 'dish.created',
    data: {
      dishId: docRef.id,
      name: newDish.name,
      price: newDish.price,
      category: newDish.category,
      ingredients: dishData.ingredients,
      createdBy: uid,
      timestamp: new Date().toISOString(),
    },
  })

  return {
    status: 201,
    body: {
      success: true,
      dish: {
        id: docRef.id,
        name: newDish.name,
        price: newDish.price,
        category: newDish.category,
        createdAt: newDish.createdAt,
      },
    },
  }
}