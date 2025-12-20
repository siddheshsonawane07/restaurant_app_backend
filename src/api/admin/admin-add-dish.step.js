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
      ingredientId: z.string(), // ingredient NAME
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
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    adminAuthMiddleware,
    errorMiddleware,
  ],
  bodySchema,
}

export const handler = async (req, { emit, logger, db }) => {
  const dishData = bodySchema.parse(req.body)
  const { uid } = req.user

  logger.info('Adding dish', {
    dishName: dishData.name,
    admin: uid,
  })

  const dishesRef = db.collection('dishes')
  const ingredientsRef = db.collection('ingredients')

  //  Validate ingredients by NAME
  const ingredientChecks = await Promise.all(
    dishData.ingredients.map(async (ing) => {
      const snapshot = await ingredientsRef
        .where('name', '==', ing.ingredientId)
        .limit(1)
        .get()

      return {
        name: ing.ingredientId,
        exists: !snapshot.empty,
      }
    })
  )

  const missingIngredients = ingredientChecks.filter(i => !i.exists)

  if (missingIngredients.length > 0) {
    const missingNames = missingIngredients.map(i => i.name).join(', ')
    logger.warn('Some ingredients do not exist', { missingNames })

    return {
      status: 400,
      body: { error: `Ingredients not found: ${missingNames}` },
    }
  }

  //  Enforce unique dish name
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

    // normalize ingredient storage
    ingredients: dishData.ingredients.map(ing => ({
      name: ing.ingredientId,
      quantity: ing.quantity,
    })),

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: uid,
  }

  const docRef = await dishesRef.add(newDish)

  logger.info('Dish created successfully', {
    docId: docRef.id,
    name: newDish.name,
  })

  await emit({
    topic: 'dish.created',
    data: {
      dishId: docRef.id,
      name: newDish.name,
      price: newDish.price,
      category: newDish.category,
      ingredients: newDish.ingredients,
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
