// import { z } from 'zod'
// import { errorMiddleware } from '../../middlewares/error.middleware.js'
// import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'

// export const config = {
//   name: 'AdminGetDishes',
//   type: 'api',
//   path: '/api/admin/dishes',
//   method: 'GET',
//   description: 'Get all dishes - Admin view (Admin only)',
//   emits: [],
//   flows: ['dish-management'],
//   middleware: [errorMiddleware, authMiddleware, adminAuthMiddleware],
//   queryParams: [
//     {
//       name: 'category',
//       description: 'Filter by category',
//     },
//     {
//       name: 'available',
//       description: 'Filter by availability (true/false)',
//     },
//   ],
//   responseSchema: {
//     200: z.object({
//       success: z.boolean(),
//       dishes: z.array(
//         z.object({
//           id: z.string(),
//           name: z.string(),
//           description: z.string().optional(),
//           price: z.number(),
//           category: z.string(),
//           ingredients: z.array(
//             z.object({
//               ingredientId: z.string(),
//               quantity: z.number(),
//             })
//           ),
//           available: z.boolean(),
//           preparationTime: z.number().optional(),
//           imageUrl: z.string().optional(),
//           createdAt: z.string(),
//           updatedAt: z.string(),
//         })
//       ),
//       total: z.number(),
//     }),
//     401: z.object({ error: z.string() }),
//     403: z.object({ error: z.string() }),
//   },
// }

// export const handler = async (req, { logger }) => {
//   try {
//     const { category, available } = req.queryParams

//     logger.info('Fetching all dishes (admin)', { admin: req.user.uid, filters: { category, available } })

//     // Import Firebase Admin
//     const admin = await import('firebase-admin')
//     const db = admin.firestore()
//     let dishesQuery = db.collection('dishes')

//     // Apply filters if provided
//     if (category) {
//       dishesQuery = dishesQuery.where('category', '==', category)
//     }

//     if (available !== undefined) {
//       const isAvailable = available === 'true'
//       dishesQuery = dishesQuery.where('available', '==', isAvailable)
//     }

//     const snapshot = await dishesQuery.orderBy('name', 'asc').get()

//     const dishes = []
//     snapshot.forEach((doc) => {
//       dishes.push({
//         id: doc.id,
//         ...doc.data(),
//       })
//     })

//     logger.info('Dishes fetched successfully', { count: dishes.length })

//     return {
//       status: 200,
//       body: {
//         success: true,
//         dishes,
//         total: dishes.length,
//       },
//     }
//   } catch (error) {
//     logger.error('Failed to fetch dishes', { error: error.message })
//     throw error
//   }
// }
