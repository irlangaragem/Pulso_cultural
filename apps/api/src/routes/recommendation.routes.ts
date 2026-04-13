import { Router, Request, Response } from 'express';
import { RecommendationService } from '../services/RecommendationService';
import { authMiddleware } from '../middlewares/auth.middleware';

const recommendationRoutes = Router();

// Public: get recommendations for a visitor (by visitorId)
recommendationRoutes.get('/visitor/:visitorId', async (req: Request, res: Response) => {
  const { visitorId } = req.params;
  try {
    const recommendations = await RecommendationService.getForVisitor(visitorId);
    return res.json({ success: true, recommendations });
  } catch (error) {
    console.error('[RecommendationRoutes] error:', error);
    return res.status(500).json({ error: 'Interno' });
  }
});

// Protected: museum-level insights for dashboard
recommendationRoutes.get('/museum/:museumId/insights', authMiddleware, async (req: Request, res: Response) => {
  const { museumId } = req.params;
  try {
    const insights = await RecommendationService.getMuseumInsights(museumId);
    return res.json({ success: true, insights });
  } catch (error) {
    console.error('[RecommendationRoutes] insights error:', error);
    return res.status(500).json({ error: 'Interno' });
  }
});

export { recommendationRoutes };
