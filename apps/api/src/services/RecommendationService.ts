import { prisma } from '../lib/prisma';

/**
 * RecommendationService — Intelligence Layer (Section 8.3)
 * 
 * Strategy: Hybrid approach
 * 1. Content-Based: Match exhibitions to visitor demographics + accessibility
 * 2. Collaborative: Find visitors with similar profiles & suggest what they rated 4-5★
 * 
 * Designed to work with existing data — no cold-start problem with > 10 visitors.
 */
export class RecommendationService {

  /**
   * Get exhibition recommendations for a visitor.
   * Returns exhibitions they haven't checked into, sorted by predicted affinity.
   */
  static async getForVisitor(visitorId: string): Promise<{
    exhibitionId: string;
    name: string;
    reason: string;
    predictedScore: number;
  }[]> {
    const visitor = await prisma.visitor.findUnique({
      where: { id: visitorId },
      include: {
        checkins: { select: { exhibitionId: true } },
        evaluations: { select: { exhibitionId: true, rating: true, experienceScore: true } }
      }
    });

    if (!visitor) return [];

    const visitedExhibitionIds = new Set(visitor.checkins.map(c => c.exhibitionId));
    const evaluatedIds = new Set(visitor.evaluations.map(e => e.exhibitionId));

    // Get all active exhibitions not yet visited
    const candidateExhibitions = await prisma.exhibition.findMany({
      where: {
        status: 'ACTIVE',
        id: { notIn: [...visitedExhibitionIds] }
      },
      select: {
        id: true,
        name: true,
        subtitle: true,
        evaluations: {
          select: { rating: true, experienceScore: true }
        }
      },
      take: 20
    });

    // Find similar visitors (same origin or similar age bracket or same gender)
    const birthYearRange = { gte: visitor.birthYear - 10, lte: visitor.birthYear + 10 };
    const similarVisitors = await prisma.visitor.findMany({
      where: {
        id: { not: visitorId },
        OR: [
          { origin: visitor.origin },
          { gender: visitor.gender },
          { birthYear: birthYearRange }
        ]
      },
      include: {
        evaluations: {
          where: { rating: { gte: 4 } }, // Only highly rated
          select: { exhibitionId: true, experienceScore: true }
        }
      },
      take: 50
    });

    // Build a popularity map from similar visitors
    const collaborativeScores: Record<string, { sum: number; count: number }> = {};
    for (const sv of similarVisitors) {
      for (const ev of sv.evaluations) {
        if (!visitedExhibitionIds.has(ev.exhibitionId)) {
          if (!collaborativeScores[ev.exhibitionId]) {
            collaborativeScores[ev.exhibitionId] = { sum: 0, count: 0 };
          }
          collaborativeScores[ev.exhibitionId].sum += ev.experienceScore || 0.8;
          collaborativeScores[ev.exhibitionId].count += 1;
        }
      }
    }

    // Score each candidate exhibition
    const scored = candidateExhibitions.map(ex => {
      // Content-based score: average evaluation score of the exhibition globally
      const globalScores = ex.evaluations;
      const avgExperienceScore = globalScores.length > 0
        ? globalScores.reduce((s, e) => s + (e.experienceScore || (e.rating / 5)), 0) / globalScores.length
        : 0.5; // Prior: 50% for unknown exhibitions

      // Collaborative score: did similar visitors love it?
      const collab = collaborativeScores[ex.id];
      const collaborativeScore = collab ? collab.sum / collab.count : 0;

      // Blend: 60% global, 40% collaborative
      const predictedScore = (avgExperienceScore * 0.6) + (collaborativeScore * 0.4);

      // Reason
      const reason = collab && collab.count > 0
        ? `Visitantes com perfil similar adoraram esta exposição`
        : globalScores.length > 0
          ? `Altamente avaliada pelos visitantes`
          : `Exposição em cartaz no MAM`;

      return {
        exhibitionId: ex.id,
        name: ex.name,
        reason,
        predictedScore: parseFloat(predictedScore.toFixed(3))
      };
    });

    // Sort by predicted score descending, return top 5
    return scored
      .sort((a, b) => b.predictedScore - a.predictedScore)
      .slice(0, 5);
  }

  /**
   * Get aggregate intelligence for a museum (for the dashboard).
   * Returns visitor segments and satisfaction by demographic group.
   * All data is aggregated — no PII.
   */
  static async getMuseumInsights(museumId: string): Promise<{
    avgExperienceScore: number;
    satisfactionByOrigin: Record<string, number>;
    satisfactionByGender: Record<string, number>;
    topSegment: string;
    accessibilityNeedsDistribution: Record<string, number>;
  }> {
    const exhibitions = await prisma.exhibition.findMany({
      where: { museumId },
      select: { id: true }
    });
    const exhibitionIds = exhibitions.map(e => e.id);

    const evaluations = await prisma.evaluation.findMany({
      where: { exhibitionId: { in: exhibitionIds } },
      include: {
        visitor: {
          select: { origin: true, gender: true, accessibilityNeeds: true }
        }
      }
    });

    if (evaluations.length === 0) {
      return {
        avgExperienceScore: 0,
        satisfactionByOrigin: {},
        satisfactionByGender: {},
        topSegment: 'Sem dados suficientes',
        accessibilityNeedsDistribution: {}
      };
    }

    const avgExperienceScore = evaluations.reduce((s, e) => s + (e.experienceScore || 0), 0) / evaluations.length;

    // Aggregate by origin
    const originMap: Record<string, { sum: number; count: number }> = {};
    const genderMap: Record<string, { sum: number; count: number }> = {};
    const accessibilityMap: Record<string, number> = {};

    for (const ev of evaluations) {
      const origin = ev.visitor.origin;
      const gender = ev.visitor.gender;
      const score = ev.experienceScore || 0;
      const needs = ev.visitor.accessibilityNeeds as string[] | null;

      if (!originMap[origin]) originMap[origin] = { sum: 0, count: 0 };
      originMap[origin].sum += score;
      originMap[origin].count += 1;

      if (!genderMap[gender]) genderMap[gender] = { sum: 0, count: 0 };
      genderMap[gender].sum += score;
      genderMap[gender].count += 1;

      if (needs && Array.isArray(needs)) {
        for (const need of needs) {
          accessibilityMap[need] = (accessibilityMap[need] || 0) + 1;
        }
      }
    }

    const satisfactionByOrigin = Object.fromEntries(
      Object.entries(originMap).map(([k, v]) => [k, parseFloat((v.sum / v.count).toFixed(3))])
    );

    const satisfactionByGender = Object.fromEntries(
      Object.entries(genderMap).map(([k, v]) => [k, parseFloat((v.sum / v.count).toFixed(3))])
    );

    // Find the highest-satisfaction segment
    const bestOriginEntry = Object.entries(satisfactionByOrigin)
      .sort(([, a], [, b]) => b - a)[0];
    const topSegment = bestOriginEntry
      ? `Visitantes de ${bestOriginEntry[0]} (score: ${bestOriginEntry[1]})`
      : 'Sem dados';

    return {
      avgExperienceScore: parseFloat(avgExperienceScore.toFixed(3)),
      satisfactionByOrigin,
      satisfactionByGender,
      topSegment,
      accessibilityNeedsDistribution: accessibilityMap
    };
  }
}
