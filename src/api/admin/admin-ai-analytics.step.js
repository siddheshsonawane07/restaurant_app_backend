import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { authMiddleware, adminAuthMiddleware } from '../../middlewares/auth.middleware.js'
import { firebaseMiddleware } from '../../middlewares/firebase.middleware.js'
import { errorMiddleware } from '../../middlewares/error.middleware.js'

const bodySchema = z.object({
  query: z.string().min(1, 'Query is required')
})

export const config = {
  name: 'AdminAIAnalytics',
  type: 'api',
  path: '/api/admin/ai-analytics',
  method: 'POST',
  description: 'AI analytics agent with streaming responses using Motia Streams',
  emits: ['ai.analytics.started', 'ai.analytics.completed'],
  flows: ['ai-analytics'],
  middleware: [
    firebaseMiddleware,
    errorMiddleware
  ],
  bodySchema
}

export const handler = async (req, { logger, db, streams, emit }) => {
  const { query } = bodySchema.parse(req.body)
  const adminId = "admin-001" // not using auth for now

  logger.info('AI Analytics query received', {
    adminId,
    query
  })

  try {
    await streams.aiAnalytics.send(`admin-${adminId}`, {
      type: 'ANALYSIS_STARTED',
      query,
      timestamp: Date.now()
    })

    const ordersSnapshot = await db.collection('orders').get()
    const orders = ordersSnapshot.docs.map(doc => ({
      orderId: doc.id,
      ...doc.data()
    }))

    logger.info('Orders fetched for analysis', { count: orders.length })

    const dishesSnapshot = await db.collection('dishes').get()
    const dishes = dishesSnapshot.docs.map(doc => ({
      dishId: doc.id,
      ...doc.data()
    }))

    const ingredientsSnapshot = await db.collection('ingredients').get()
    const ingredients = ingredientsSnapshot.docs.map(doc => ({
      ingredientId: doc.id,
      ...doc.data()
    }))

    const contextData = {
      totalOrders: orders.length,
      orders: orders.slice(0, 100),
      dishes,
      ingredients,
      timestamp: Date.now()
    }

    const systemPrompt = `You are an intelligent restaurant analytics assistant. 

You have access to the following data:
- Orders: ${contextData.totalOrders} total orders
- Dishes: ${dishes.length} menu items
- Ingredients: ${ingredients.length} ingredients

Analyze the data and provide insights for questions like:
1. What ingredients are required the most?
2. What dishes are used/ordered the most?
3. What is the combination of dishes customers order together?
4. What is the average cost of orders?
5. Which dishes should be promoted?
6. What are the order patterns and trends?

Provide clear, actionable insights with specific data points.
Format your response in a structured, easy-to-read way.

Data context:
${JSON.stringify(contextData, null, 2)}`

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I have access to your restaurant data and can provide analytics insights. What would you like to know?' }]
        }
      ]
    })

    logger.info('Starting Gemini streaming response')

    const result = await chat.sendMessageStream(query)

    let fullResponse = ''
    let chunkCount = 0

    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      fullResponse += chunkText
      chunkCount++

      await streams.aiAnalytics.send(`admin-${adminId}`, {
        type: 'CHUNK',
        chunk: chunkText,
        timestamp: Date.now()
      })

      logger.debug('Chunk sent', { chunkIndex: chunkCount, length: chunkText.length })
    }

    logger.info('Streaming completed', {
      totalChunks: chunkCount,
      responseLength: fullResponse.length
    })

    const responseId = `response-${Date.now()}`
    await streams.aiAnalytics.set(adminId, responseId, {
      type: 'ANALYSIS_COMPLETED',
      query,
      fullResponse,
      timestamp: Date.now()
    })

    await emit({
      topic: 'ai.analytics.completed',
      data: {
        adminId,
        query,
        responseLength: fullResponse.length,
        timestamp: Date.now()
      }
    })

    return {
      status: 200,
      body: {
        success: true,
        message: 'Analysis completed',
        responseId,
        responsePreview: fullResponse.substring(0, 200)
      }
    }

  } catch (error) {
    logger.error('AI Analytics failed', {
      adminId,
      query,
      error: error.message,
      stack: error.stack
    })

    await streams.aiAnalytics.send(`admin-${adminId}`, {
      type: 'ERROR',
      error: error.message,
      timestamp: Date.now()
    })

    throw error
  }
}