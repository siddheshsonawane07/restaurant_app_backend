import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

export const config = {
  name: 'AdminGetDashboard',
  type: 'api',
  path: '/api/admin/orders/dashboard',
  method: 'GET',
  description: 'Get admin dashboard data',
  flows: ['order-management'],
  emits: ['admin.dashboard'],
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    adminAuthMiddleware,
    errorMiddleware
  ]
}

export const handler = async (req, { logger, db }) => {
  logger.info('Loading admin dashboard')

  const ordersSnapshot = await db
    .collection('orders')
    .where('status', 'in', ['pending', 'accepted', 'preparing', 'ready'])
    .get()

  const ordersByStatus = {
    pending: [],
    accepted: [],
    preparing: [],
    ready: []
  }

  const counts = {
    pending: 0,
    accepted: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    rejected: 0
  }

  ordersSnapshot.forEach(doc => {
    const order = doc.data()

    const summary = {
      orderId: doc.id,
      customerId: order.customerId,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      itemCount: order.items.length,
      status: order.status,
      currentMessage: order.currentMessage || '',
      lastUpdatedAt: order.lastUpdatedAt,
      createdAt: order.createdAt
    }

    if (ordersByStatus[order.status]) {
      ordersByStatus[order.status].push(summary)
      counts[order.status]++
    }
  })

  const completedSnapshot = await db
    .collection('orders')
    .where('status', '==', 'completed')
    .get()
  counts.completed = completedSnapshot.size

  const rejectedSnapshot = await db
    .collection('orders')
    .where('status', '==', 'rejected')
    .get()
  counts.rejected = rejectedSnapshot.size

  const dashboardData = {
    ...ordersByStatus,
    counts
  }

  logger.info('Dashboard loaded successfully', { counts })

  return {
    status: 200,
    body: dashboardData
  }
}
