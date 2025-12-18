import { z } from 'zod';
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'


export const config = {
  name: 'CustomerGetMenu',
  type: 'api',
  path: '/api/customer/menu',
  method: 'GET',
  description: 'Get public menu with available dishes (no auth required)',
  emits: [],
  flows: ['customer-menu'],
  middleware: [errorMiddleware],
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
          id: z.string(),
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
};

export const handler = async (req, { logger }) => {
  try {
    const { category } = req.queryParams;

    logger.info('Fetching public menu', { filters: { category } });

    // Import Firebase Admin
    const admin = await import('firebase-admin');
    const db = admin.firestore();
    let menuQuery = db.collection('dishes');

    // Only show available dishes to customers
    menuQuery = menuQuery.where('available', '==', true);

    // Apply category filter if provided
    if (category) {
      menuQuery = menuQuery.where('category', '==', category);
    }

    const snapshot = await menuQuery.orderBy('category').orderBy('name', 'asc').get();

    const menu = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Only return customer-relevant fields (hide internal data like ingredients details)
      menu.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        preparationTime: data.preparationTime,
        imageUrl: data.imageUrl,
        available: data.available,
      });
    });

    logger.info('Menu fetched successfully', { count: menu.length });

    return {
      status: 200,
      body: {
        success: true,
        menu,
        total: menu.length,
      },
    };
  } catch (error) {
    logger.error('Failed to fetch menu', { error: error.message });
    throw error;
  }
};
