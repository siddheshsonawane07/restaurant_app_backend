import { z } from 'zod';
import { errorMiddleware } from '../../middlewares/error.middleware.js'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { getFirestore } from '../../services/firebase.service.js';


export const config = {
  name: 'CustomerGetMenu',
  type: 'api',
  path: '/api/customer/menu',
  method: 'GET',
  description: 'Get public menu with available dishes (no auth required)',
  emits: [],
  flows: ['customer-menu'],
  middleware: [],
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
    logger.info('CustomerGetMenu handler started');
    
    const queryParams = req.query || req.queryParams || {};
    const { category } = queryParams;

    logger.info('Query params', { category, allParams: queryParams });

    // Get Firestore instance
    const db = getFirestore();
    logger.info('Firestore instance obtained');

    // Build query
    let menuQuery = db.collection('dishes').where('available', '==', true);

    if (category) {
      menuQuery = menuQuery.where('category', '==', category);
    }

    logger.info('Executing Firestore query...');
    
    // Execute query WITHOUT orderBy first to test
    const snapshot = await menuQuery.get();
    
    logger.info('Query executed', { documentCount: snapshot.size });

    const menu = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      menu.push({
        id: doc.id,
        name: data.name,
        description: data.description || '',
        price: data.price,
        category: data.category,
        preparationTime: data.preparationTime,
        imageUrl: data.imageUrl,
        available: data.available,
      });
    });

    // Sort in JavaScript instead of Firestore
    menu.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
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
    logger.error('Failed to fetch menu', { 
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStack: error?.stack,
      errorName: error?.name
    });
    
    // Return error response directly
    return {
      status: 500,
      body: {
        success: false,
        error: {
          message: error?.message || 'Failed to fetch menu',
          code: 500
        },
      },
    };
  }
};