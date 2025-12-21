import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

export const config = {
  name: 'CustomerGetOrder',
  type: 'api',
  path: '/api/customer/orders/:orderId',
  method: 'GET',
  description: 'Get single order details',
  flows: ['order-management'],
  emits: ['order.loaded'],
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    errorMiddleware
  ]
}

export const handler = async (req, { logger, db }) => {
  const { orderId } = req.pathParams
  const userId = req.user.uid
  const isAdmin = req.user.admin === true

  logger.info('Loading order details', {
    orderId,
    customerId: userId
  })

  const orderDoc = await db.collection('orders').doc(orderId).get()

  if (!orderDoc.exists) {
    logger.warn('Order not found', { orderId })
    return {
      status: 404,
      body: { error: 'Order not found' }
    }
  }

  const order = orderDoc.data()

  //  Authorization: owner or admin
  if (order.customerId !== userId && !isAdmin) {
    logger.warn('Unauthorized order access', {
      orderId,
      customerId: userId,
      orderOwner: order.customerId
    })
    return {
      status: 403,
      body: { error: 'Unauthorized to view this order' }
    }
  }

  const orderData = {
    orderId,
    customerId: order.customerId,
    customerName: order.customerName,
    items: order.items,
    totalAmount: order.totalAmount,
    status: order.status,
    currentMessage: order.currentMessage || '',
    lastUpdatedBy: order.lastUpdatedBy || '',
    lastUpdatedAt: order.lastUpdatedAt,
    createdAt: order.createdAt
  }

  logger.info('Order details loaded', { orderId })

  return {
    status: 200,
    body: { order: orderData }
  }
}
