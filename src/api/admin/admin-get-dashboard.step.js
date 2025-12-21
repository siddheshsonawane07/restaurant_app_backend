import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

export const config = {
  name: 'GetAdminDashboard',
  type: 'api',
  path: '/api/admin/dashboard',
  method: 'GET',
  description: 'Get order counts by status for admin dashboard',
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    adminAuthMiddleware,
    errorMiddleware,
  ],
  flows: ['dashboard'],
  emits: ['admin.dashboard_fetched'],
}

export const handler = async (req, { logger, db }) => {
  logger.info('Fetching admin dashboard data')

  const counts = {
    pending: 0,
    accepted: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    rejected: 0,
  }

  const pendingSnapshot = await db.collection('orders').where('status', '==', 'pending').get()
  counts.pending = pendingSnapshot.size

  const acceptedSnapshot = await db.collection('orders').where('status', '==', 'accepted').get()
  counts.accepted = acceptedSnapshot.size

  const preparingSnapshot = await db.collection('orders').where('status', '==', 'preparing').get()
  counts.preparing = preparingSnapshot.size

  const readySnapshot = await db.collection('orders').where('status', '==', 'ready').get()
  counts.ready = readySnapshot.size

  const completedSnapshot = await db.collection('orders').where('status', '==', 'completed').get()
  counts.completed = completedSnapshot.size

  const rejectedSnapshot = await db.collection('orders').where('status', '==', 'rejected').get()
  counts.rejected = rejectedSnapshot.size

  logger.info('Dashboard data fetched successfully', counts)

  return {
    status: 200,
    body: { counts },
  }
}