import OpenAI from 'openai'
import { z } from 'zod'
import { adminAuthMiddleware, authMiddleware } from '../../middlewares/auth.middleware.js'
import { errorMiddleware } from '../../middlewares/error.middleware.js'

const bodySchema = z.object({
  query: z.string().min(1, 'Query is required')
})

export const config = {
  name: 'AdminAIAgent',
  type: 'api',
  path: '/api/admin/ai-agent',
  method: 'POST',
  description: 'AI agent for admin natural-language commands',
  emits: [],
  flows: ['ai-agent'],
  middleware: [errorMiddleware, authMiddleware, adminAuthMiddleware],
  bodySchema,
  responseSchema: {
    200: z.object({
      success: z.boolean(),
      query: z.string(),
      agentPlan: z.any()
    })
  }
}

export const handler = async (req, { logger }) => {
  const { query } = bodySchema.parse(req.body)
  const { uid } = req.user
  logger.info('Admin AI agent called', { admin: uid, query })

 const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

  const systemPrompt = `
You are an assistant for a restaurant admin.
Return ONLY JSON:
{
  "actions": [
    {
      "type": "OUT_OF_STOCK" | "IN_STOCK" | "SET_DISCOUNT",
      "target": "ingredient or dish name",
      "value": "optional extra info"
    }
  ],
  "summary": "short explanation"
}
`

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ],
    response_format: { type: 'json_object' }
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  let plan
  try {
    plan = JSON.parse(raw)
  } catch (e) {
    logger.error('Failed to parse AI JSON', { raw })
    plan = { raw }
  }

  return {
    status: 200,
    body: {
      success: true,
      query,
      agentPlan: plan
    }
  }
}