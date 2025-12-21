import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

export const config = {
  name: 'GetAllOrders',
  type: 'api',
  path: '/api/admin/orders',
  method: 'GET',
  description: 'Get all orders for admin (excluding completed and rejected)',
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    adminAuthMiddleware,
    errorMiddleware,
  ],
  emits: ['order.fetched'],
    flows: ['order-management'],
}

export const handler = async (req, { logger, db }) => {
  logger.info('Fetching all orders for admin')

  const ordersSnapshot = await db.collection('orders')
    .where('status', 'in', ['pending', 'accepted', 'preparing', 'ready'])
    .get()

  const orders = []

  for (const doc of ordersSnapshot.docs) {
    const orderData = doc.data()

    orders.push({
      orderId: doc.id,
      customerId: orderData.customerId,
      customerName: orderData.customerName || 'Unknown Customer',
      items: orderData.items || [],
      totalAmount: orderData.totalAmount || 0,
      status: orderData.status,
      createdAt: orderData.createdAt,
      updatedAt: orderData.updatedAt,
    })
  }

  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  logger.info('Orders fetched successfully', { count: orders.length })

  return {
    status: 200,
    body: { orders },
  }
}