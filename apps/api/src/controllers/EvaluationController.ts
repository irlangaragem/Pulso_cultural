import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { HashService } from '../services/HashService';
import { getIO } from '../lib/socket';
import { AnalyticsService } from '../services/AnalyticsService';
import { SentimentAnalyzer } from '../services/SentimentAnalyzer';

export class EvaluationController {
  constructor() {
    this.submit = this.submit.bind(this);
    this.getSummary = this.getSummary.bind(this);
  }

  /**
   * POST /evaluations
   * Submit a visitor evaluation for an exhibition.
   * Experience Score = (rating * 0.7) + (sentiment * 0.3)
   */
  async submit(req: Request, res: Response) {
    const { cpf, exhibitionId, rating, comment, shareChannel, sessionId } = req.body;

    if (!exhibitionId || !rating) {
      return res.status(400).json({ error: 'exhibitionId e rating são obrigatórios' });
    }
    if (!cpf) {
      return res.status(400).json({ error: 'cpf é obrigatório' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating deve ser entre 1 e 5' });
    }

    try {
      const cpfHash = await HashService.hashCPF(cpf);
      const visitor = await prisma.visitor.findUnique({ where: { cpfHash } });

      if (!visitor) {
        return res.status(404).json({ error: 'Visitante não encontrado' });
      }

      // Intelligence Layer: Sentiment Analysis + Experience Score
      const sentiment = comment ? SentimentAnalyzer.analyze(comment) : 0;
      const experienceScore = SentimentAnalyzer.computeExperienceScore(rating, sentiment);

      // Upsert: allow re-evaluation (update if already exists)
      const evaluation = await prisma.evaluation.upsert({
        where: {
          visitorId_exhibitionId: {
            visitorId: visitor.id,
            exhibitionId
          }
        },
        create: {
          visitorId: visitor.id,
          exhibitionId,
          rating,
          comment: comment || null,
          shareChannel: shareChannel || null,
          sentiment,
          experienceScore
        },
        update: {
          rating,
          comment: comment || null,
          shareChannel: shareChannel || null,
          sentiment,
          experienceScore
        }
      });

      // Track the event in the Analytics Service
      await AnalyticsService.track({
        sessionId: sessionId || 'anonymous',
        event: 'rating_submitted',
        exhibitionId,
        properties: {
          rating,
          hasComment: !!comment,
          shareChannel
        }
      });

      // Emit real-time update for dashboard
      getIO().emit('evaluation_update', {
        type: 'evaluation',
        exhibitionId,
        rating,
        timestamp: new Date()
      });

      return res.status(201).json({
        success: true,
        evaluationId: evaluation.id,
        experienceScore: evaluation.experienceScore
      });

    } catch (error) {
      console.error('[EvaluationController] submit error:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }

  /**
   * GET /evaluations/:exhibitionId/summary
   * Aggregate stats for the manager dashboard.
   * Returns only aggregate data, NO PII.
   */
  async getSummary(req: Request, res: Response) {
    const { exhibitionId } = req.params;

    try {
      const evals = await prisma.evaluation.findMany({
        where: { exhibitionId },
        select: { rating: true, experienceScore: true, shareChannel: true }
      });

      if (evals.length === 0) {
        return res.json({
          totalEvaluations: 0,
          averageRating: 0,
          averageExperienceScore: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          shareChannels: {}
        });
      }

      const totalEvaluations = evals.length;
      const averageRating = evals.reduce((s, e) => s + e.rating, 0) / totalEvaluations;
      const averageExperienceScore = evals.reduce((s, e) => s + (e.experienceScore || 0), 0) / totalEvaluations;

      const ratingDistribution = evals.reduce((acc, e) => {
        acc[e.rating] = (acc[e.rating] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const shareChannels = evals.reduce((acc, e) => {
        if (e.shareChannel) acc[e.shareChannel] = (acc[e.shareChannel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return res.json({
        totalEvaluations,
        averageRating: parseFloat(averageRating.toFixed(2)),
        averageExperienceScore: parseFloat(averageExperienceScore.toFixed(2)),
        ratingDistribution,
        shareChannels
      });

    } catch (error) {
      console.error('[EvaluationController] getSummary error:', error);
      return res.status(500).json({ error: 'Erro interno' });
    }
  }
}
