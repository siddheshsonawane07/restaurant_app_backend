// src/services/ai-order-summary.service.js
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * stats: [{ name, orders, revenue }]
 */
export async function summarizeOrdersWithAI(stats) {
  const lines = stats.length
    ? stats
        .map(
          (s) => `- ${s.name}: ${s.orders} orders, ₹${s.revenue}`
        )
        .join('\n')
    : 'No orders.';

  const systemPrompt = `
You are an analytics assistant for a restaurant admin.
Given dish stats, write a short daily report:

1. Top 3 dishes (by orders) with counts.
2. Any very low-selling dishes.
3. Total revenue and approximate average order value.
4. One concrete suggestion to improve tomorrow's sales.

Use simple bullet points and keep it under 8 lines.
`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Dish stats:\n${lines}` }
    ]
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}
