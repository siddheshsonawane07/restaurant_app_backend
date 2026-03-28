// src/cron/daily-order-summary.step.js
import { summarizeOrdersWithAI } from '../services/ai-order-summary.service.js';
import { getDailyOrderStats } from '../services/order-analytics.service.js'; // Siddesh review - To be created!!!!!

export const config = {
  name: 'DailyOrderSummary',
  type: 'cron',
  schedule: '0 23 * * *', // every day at 23:00
  description: 'Generate daily order summary with AI',
  emits: ['report.daily.generated'],
  flows: ['reporting']
};

export const handler = async (_req, { emit, logger }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = today.toISOString().split('T')[0];

  // If multi-hotel: loop over hotels; for now assume single restaurant
  const hotelId = 'default-hotel'; // siddesh review

  logger.info('DailyOrderSummary: collecting stats', { hotelId, dateStr });

  const stats = await getDailyOrderStats(hotelId, today); // [{name, orders, revenue}, ...]

  const summary = await summarizeOrdersWithAI(stats);

  // Siddesh Review: save to Firestore
  // e.g. reports/{hotelId}/{dateStr}
  // await saveDailyReport(hotelId, dateStr, summary);

  logger.info('DailyOrderSummary: summary generated', { summary });

  await emit({
    topic: 'report.daily.generated', //Siddesh Review - To be created!!!!!!(notification logic)
    data: { hotelId, date: dateStr, summary }
  });

  return {
    status: 200,
    body: { hotelId, date: dateStr, summary }
  };
};