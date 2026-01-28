import { z } from 'zod'
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'

export const config = {
  name: 'CustomerGetMenu',
  type: 'api',
  path: '/api/customer/menu',
  method: 'GET',
  description: 'Get public menu with available dishes (no auth required)',
  emits: ['menu.fetched'],
  flows: ['menu'],
  middleware: [firebaseMiddleware, errorMiddleware],
  queryParams: [
    {
      name: 'category',
      description: 'Filter by category',
    },
  ],
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      menu: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          price: z.number(),
          category: z.string(),
          preparationTime: z.number().optional(),
          imageUrl: z.string().optional(),
          available: z.boolean(),
        })
      ),
      total: z.number(),
    }),
  },
}

export const handler = async (req, { logger, db }) => {
  logger.info('CustomerGetMenu handler started')

  const { category } = req.query || {}

  let menuQuery = db
    .collection('dishes')
    .where('available', '==', true)

  if (category) {
    menuQuery = menuQuery.where('category', '==', category)
  }

  const snapshot = await menuQuery.get()

  const menu = snapshot.docs.map(doc => ({
    ...doc.data(),
  }))

  return {
    status: 200,
    body: {
      success: true,
      menu,
      total: menu.length,
    },
  }
}
