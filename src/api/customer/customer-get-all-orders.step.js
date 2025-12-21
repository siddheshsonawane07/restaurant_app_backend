import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

export const config = {
  name: 'CustomerGetOrders',
  type: 'api',
  path: '/api/customer/orders',
  method: 'GET',
  description: 'Get customer orders',
  flows: ['order-management'],
  emits: ['orders.loaded'],
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    errorMiddleware
  ]
}

export const handler = async (req, { logger, db }) => {
  const userId = req.user.uid

  logger.info('Loading customer orders', { customerId: userId })

  const ordersSnapshot = await db
    .collection('orders')
    .where('customerId', '==', userId)
    .get()

  const orders = []

  ordersSnapshot.forEach(doc => {
    const order = doc.data()

    orders.push({
      orderId: doc.id,
      customerId: order.customerId,
      customerName: order.customerName,
      items: order.items,
      totalAmount: order.totalAmount,
      status: order.status,
      currentMessage: order.currentMessage || '',
      lastUpdatedBy: order.lastUpdatedBy || '',
      lastUpdatedAt: order.lastUpdatedAt,
      createdAt: order.createdAt
    })
  })

  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  logger.info('Customer orders loaded', {
    customerId: userId,
    orderCount: orders.length
  })

  return {
    status: 200,
    body: { orders }
  }
}