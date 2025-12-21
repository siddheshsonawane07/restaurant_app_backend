import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'


const bodySchema = z.object({
  items: z.array(
    z.object({
      dishName: z.string().min(1, 'Dish name is required'),
      quantity: z.number().min(1, 'Quantity must be at least 1'),
    })
  ).min(1, 'Order must contain at least one item'),
})

export const config = {
  name: 'CustomerPlaceOrder',
  type: 'api',
  path: '/api/customer/orders',
  method: 'POST',
  description: 'Place a new order',
  emits: ['order.placed'],
  flows: ['order-management'],
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    errorMiddleware,
  ],
  bodySchema,
}

export const handler = async (req, { emit, logger, db }) => {
  const orderData = bodySchema.parse(req.body)
  const { uid } = req.user

  logger.info('Processing order', {
    customerId: uid,
    itemCount: orderData.items.length,
  })

  const dishesRef = db.collection('dishes')
  const ingredientsRef = db.collection('ingredients')

  const dishNames = orderData.items.map(item => item.dishName)
  const dishesSnapshot = await dishesRef
    .where('name', 'in', dishNames)
    .get()

  if (dishesSnapshot.empty) {
    logger.warn('No dishes found for order')
    return {
      status: 400,
      body: { error: 'No valid dishes found in order' },
    }
  }

  const dishesMap = new Map()
  dishesSnapshot.forEach(doc => {
    const data = doc.data()
    dishesMap.set(data.name, {
      id: doc.id,
      ...data,
    })
  })

  const missingDishes = dishNames.filter(name => !dishesMap.has(name))
  if (missingDishes.length > 0) {
    logger.warn('Some dishes not found', { missingDishes })
    return {
      status: 400,
      body: { 
        error: 'Some dishes not found', 
        missingDishes 
      },
    }
  }

  const unavailableDishes = dishNames.filter(name => {
    const dish = dishesMap.get(name)
    return !dish.available
  })

  if (unavailableDishes.length > 0) {
    logger.warn('Some dishes unavailable', { unavailableDishes })
    return {
      status: 400,
      body: { 
        error: 'Some dishes are currently unavailable', 
        unavailableDishes 
      },
    }
  }

  const allIngredientNames = new Set()
  dishNames.forEach(dishName => {
    const dish = dishesMap.get(dishName)
    dish.ingredients.forEach(ing => {
      allIngredientNames.add(ing.name)
    })
  })

  const ingredientsSnapshot = await ingredientsRef
    .where('name', 'in', Array.from(allIngredientNames))
    .get()

  const ingredientsMap = new Map()
  ingredientsSnapshot.forEach(doc => {
    const data = doc.data()
    ingredientsMap.set(data.name, {
      id: doc.id,
      ...data,
    })
  })

  const requiredIngredients = new Map()
  orderData.items.forEach(orderItem => {
    const dish = dishesMap.get(orderItem.dishName)
    
    dish.ingredients.forEach(dishIng => {
      const currentRequired = requiredIngredients.get(dishIng.name) || 0
      requiredIngredients.set(
        dishIng.name, 
        currentRequired + (dishIng.quantity * orderItem.quantity)
      )
    })
  })

  const adjustments = []
  const finalItems = []

  orderData.items.forEach(orderItem => {
    const dish = dishesMap.get(orderItem.dishName)
    let maxFulfillableQuantity = orderItem.quantity

    dish.ingredients.forEach(dishIng => {
      const ingredient = ingredientsMap.get(dishIng.name)
      if (!ingredient) {
        maxFulfillableQuantity = 0
        return
      }

      const availableStock = ingredient.quantity
      const requiredPerDish = dishIng.quantity
      const maxPossible = Math.floor(availableStock / requiredPerDish)

      if (maxPossible < maxFulfillableQuantity) {
        maxFulfillableQuantity = maxPossible
      }
    })

    if (maxFulfillableQuantity < orderItem.quantity) {
      adjustments.push({
        dishName: orderItem.dishName,
        requestedQuantity: orderItem.quantity,
        fulfilledQuantity: maxFulfillableQuantity,
        reason: maxFulfillableQuantity === 0 
          ? 'Insufficient ingredients' 
          : 'Partially fulfilled due to ingredient availability',
      })
    }

    if (maxFulfillableQuantity > 0) {
      finalItems.push({
        dishName: orderItem.dishName,
        quantity: maxFulfillableQuantity,
        priceAtOrder: dish.price,
        dishId: dish.id,
      })
    }
  })

  if (finalItems.length === 0) {
    logger.warn('Cannot fulfill any items in order', { customerId: uid })
    return {
      status: 400,
      body: { 
        error: 'Cannot fulfill order due to insufficient stock',
        adjustments 
      },
    }
  }

  const totalAmount = finalItems.reduce((sum, item) => {
    return sum + (item.priceAtOrder * item.quantity)
  }, 0)

  const ordersRef = db.collection('orders')
  const newOrder = {
    customerId: uid,
    items: finalItems,
    totalAmount,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const orderDoc = await ordersRef.add(newOrder)

  logger.info('Order created successfully', {
    orderId: orderDoc.id,
    customerId: uid,
    totalAmount,
    itemCount: finalItems.length,
    hasAdjustments: adjustments.length > 0,
  })

  await emit({
    topic: 'order.placed',
    data: {
      orderId: orderDoc.id,
      customerId: uid,
      items: finalItems,
      totalAmount,
      status: 'pending',
      timestamp: new Date().toISOString(),
    },
  })

  const response = {
    success: true,
    orderId: orderDoc.id,
    items: finalItems,
    totalAmount,
    status: 'pending',
    message: adjustments.length > 0 
      ? 'Order partially fulfilled due to stock availability' 
      : 'Order placed successfully',
  }

  if (adjustments.length > 0) {
    response.adjustments = adjustments
  }

  return {
    status: 201,
    body: response,
  }
}