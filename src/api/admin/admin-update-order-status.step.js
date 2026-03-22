import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

const bodySchema = z.object({
  newStatus: z.enum([
    'accepted',
    'rejected',
    'preparing',
    'ready',
    'completed',
    'cancelled'
  ]),
  adminMessage: z.string().optional().default('')
})

export const config = {
  name: 'AdminUpdateOrderStatus',
  type: 'api',
  path: '/api/admin/orders/:orderId/status',
  method: 'PUT',
  description: 'Update order status',
  emits: ['order.status_changed', 'order.accepted'],
  flows: ['order-management'],
  middleware: [
    firebaseMiddleware,
    authMiddleware,
    adminAuthMiddleware,
    errorMiddleware
  ],
  bodySchema
}

const VALID_TRANSITIONS = {
  pending: ['accepted', 'rejected'],
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['completed'],
  cancelled: ['cancelled'],
}

export const handler = async (req, { emit, logger, db }) => {
  const { orderId } = req.pathParams
  const { newStatus, adminMessage } = bodySchema.parse(req.body)
  const adminId = req.user.uid

  logger.info('Updating order status', {
    orderId,
    newStatus,
    adminId
  })

  const orderRef = db.collection('orders').doc(orderId)
  const orderDoc = await orderRef.get()

  if (!orderDoc.exists) {
    logger.warn('Order not found', { orderId })
    return {
      status: 404,
      body: { error: 'Order not found' }
    }
  }

  const currentOrder = orderDoc.data()
  const previousStatus = currentOrder.status

  if (!VALID_TRANSITIONS[previousStatus]?.includes(newStatus)) {
    logger.warn('Invalid status transition', {
      orderId,
      from: previousStatus,
      to: newStatus
    })
    return {
      status: 400,
      body: {
        error: `Cannot transition from ${previousStatus} to ${newStatus}`
      }
    }
  }

  const timestamp = Date.now()

  await orderRef.update({
    status: newStatus,
    currentMessage: adminMessage,
    lastUpdatedBy: adminId,
    lastUpdatedAt: timestamp
  })

  const updatedOrder = {
    orderId,
    customerId: currentOrder.customerId,
    customerName: currentOrder.customerName,
    items: currentOrder.items,
    totalAmount: currentOrder.totalAmount,
    status: newStatus,
    currentMessage: adminMessage,
    lastUpdatedBy: adminId,
    lastUpdatedAt: timestamp,
    createdAt: currentOrder.createdAt
  }

  // Emit events
  logger.info('Emitting order.status_changed event', { orderId, newStatus })
  
  await emit({
    topic: 'order.status_changed',
    data: {
      orderId,
      previousStatus,
      newStatus,
      changedBy: adminId,
      timestamp,
      orderData: updatedOrder
    }
  })

  if (newStatus === 'accepted') {
    logger.info('EMITTING order.accepted EVENT', {
      orderId,
      itemCount: currentOrder.items.length,
      items: currentOrder.items
    })
    
    await emit({
      topic: 'order.accepted',
      data: {
        orderId,
        items: currentOrder.items,
        acceptedBy: adminId,
        timestamp
      }
    })
    
    logger.info('order.accepted EVENT EMITTED SUCCESSFULLY')
  }

  logger.info('Order status updated successfully', {
    orderId,
    from: previousStatus,
    to: newStatus
  })

  return {
    status: 200,
    body: {
      success: true,
      order: updatedOrder,
      transition: {
        from: previousStatus,
        to: newStatus,
        at: timestamp
      }
    }
  }
}