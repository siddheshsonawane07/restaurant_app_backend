import { getFirestore } from '../config/firebase.js'

export const config = {
  name: 'DeductInventoryOnAccept',
  type: 'event',
  subscribes: ['order.accepted'],
  emits: ['inventory.deducted'],
  flows: ['order-management'],
    infrastructure: {
    queue: {
      type: 'fifo',
      maxRetries: 5,
    }
  },
  description: 'Deduct ingredient stock when order is accepted'
} 

export const handler = async (event, { logger, emit }) => {
  logger.info('EVENT RECEIVED', { event })
  
  const { orderId, items } = event

  logger.info('EVENT TRIGGERED: Deducting inventory for accepted order', {
    orderId,
    itemCount: items?.length,
    items: items
  })

  try {
    const db = getFirestore()
    const dishesRef = db.collection('dishes')
    const ingredientsRef = db.collection('ingredients')

    const dishIds = items.map(item => item.dishId)
    
    logger.info('Fetching dishes', { dishIds })
    
    const dishesSnapshot = await dishesRef
      .where('__name__', 'in', dishIds)
      .get()

    const dishesMap = new Map()
    dishesSnapshot.forEach(doc => {
      dishesMap.set(doc.id, doc.data())
    })

    logger.info('Dishes fetched', { count: dishesMap.size })

    const allIngredientNames = new Set()
    items.forEach(orderItem => {
      const dish = dishesMap.get(orderItem.dishId)
      if (dish && dish.ingredients) {
        dish.ingredients.forEach(ing => {
          allIngredientNames.add(ing.name)
        })
      }
    })

    logger.info('Ingredient names collected', { 
      ingredients: Array.from(allIngredientNames) 
    })

    const ingredientsSnapshot = await ingredientsRef
      .where('name', 'in', Array.from(allIngredientNames))
      .get()

    const ingredientsMap = new Map()
    ingredientsSnapshot.forEach(doc => {
      const data = doc.data()
      ingredientsMap.set(data.name, {
        id: doc.id,
        ...data
      })
    })

    logger.info('Ingredients fetched', { count: ingredientsMap.size })

    const batch = db.batch()
    const deductions = []

    items.forEach(orderItem => {
      const dish = dishesMap.get(orderItem.dishId)
      
      if (dish && dish.ingredients) {
        dish.ingredients.forEach(dishIng => {
          const ingredient = ingredientsMap.get(dishIng.name)
          
          if (ingredient) {
            const deductAmount = dishIng.quantity * orderItem.quantity
            const newQuantity = ingredient.quantity - deductAmount
            
            const ingredientRef = ingredientsRef.doc(ingredient.id)
            batch.update(ingredientRef, {
              quantity: newQuantity
            })

            deductions.push({
              ingredientName: dishIng.name,
              previousQuantity: ingredient.quantity,
              deducted: deductAmount,
              newQuantity: newQuantity
            })

            ingredientsMap.set(dishIng.name, {
              ...ingredient,
              quantity: newQuantity
            })
          }
        })
      }
    })

    logger.info('Committing batch update', { deductionCount: deductions.length })

    await batch.commit()

    logger.info('Inventory deducted successfully', {
      orderId,
      deductions
    })

    await emit({
      topic: 'inventory.deducted',
      data: {
        orderId,
        deductions,
        timestamp: Date.now()
      }
    })

    return {
      success: true,
      orderId,
      deductions
    }
  } catch (error) {
    logger.error('Failed to deduct inventory', {
      orderId,
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}