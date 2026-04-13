/**
 * SentimentAnalyzer — Portuguese Lexicon-Based Sentiment Scoring
 * 
 * Architecture: Intelligence Layer (Section 8.1)
 * Output: score from -1.0 (very negative) to +1.0 (very positive)
 * 
 * Designed for museum visitor comments. No external API calls.
 * LGPD-compliant: processes data in-memory, no data leaves the system.
 */

const POSITIVE_WORDS = new Set([
  // Intensifiers
  'excelente', 'incrível', 'incrivel', 'fantástico', 'fantastico', 'maravilhoso',
  'extraordinário', 'extraordinario', 'espetacular', 'excepcional', 'impressionante',
  'magnífico', 'magnifico', 'sensacional',
  // Positive evaluations
  'ótimo', 'otimo', 'bom', 'bons', 'boa', 'boas', 'bonito', 'bonita', 'lindo', 'linda',
  'belíssimo', 'belissimo', 'belo', 'bela', 'rico', 'rica', 'enriquecedor',
  'interessante', 'envolvente', 'emocionante', 'tocante', 'marcante', 'impactante',
  // Cultural vocabulary
  'arte', 'cultura', 'história', 'historia', 'educativo', 'inspirador', 'inspiradora',
  'criativo', 'criativa', 'único', 'unico', 'especial', 'raro', 'rara',
  // Experience words
  'adorei', 'amei', 'gostei', 'curtei', 'aprovei', 'recomendo', 'voltarei',
  'imperdível', 'imperdivel', 'vale', 'merece', 'surpreendente', 'surpreendeu',
  'encantador', 'encantei', 'encantado', 'encantada', 'valeu', 'parabéns', 'parabens',
  'obrigado', 'obrigada', 'gratidão', 'gratidao', 'feliz', 'satisfeito', 'satisfeita',
  'prazer', 'alegria', 'orgulho', 'progresso', 'acesso', 'gratuito', 'gratuita',
]);

const NEGATIVE_WORDS = new Set([
  // Negative evaluations
  'ruim', 'péssimo', 'pessimo', 'horrível', 'horrivel', 'terrível', 'terrivel',
  'decepcionante', 'dececionou', 'decepcionou', 'desapontante', 'desapontou',
  'chato', 'chata', 'cansativo', 'cansativa', 'enfadonho', 'monótono', 'monotono',
  'fraco', 'fraca', 'pobre', 'limitado', 'limitada', 'raso', 'rasa', 'superficial',
  // Structural complaints
  'difícil', 'dificil', 'complicado', 'complicada', 'confuso', 'confusa',
  'desorganizado', 'desorganizada', 'lento', 'lenta', 'demorado', 'demorada',
  'fila', 'espera', 'lotado', 'lotada', 'barulhento', 'barulhenta',
  // Accessibility issues
  'inacessível', 'inacessivel', 'degrau', 'barreira', 'problema', 'problemas',
  'quebrado', 'quebrada', 'sujo', 'suja', 'abandonado', 'abandonada',
  // Emotional negatives
  'triste', 'frustrado', 'frustrada', 'irritado', 'irritada', 'chateado', 'chateada',
  'decepção', 'decepcao', 'vergonha', 'negligência', 'negligencia',
]);

const NEGATION_WORDS = new Set([
  'não', 'nao', 'nunca', 'jamais', 'nem', 'tampouco', 'nenhum', 'nenhuma',
  'nada', 'sem', 'pouco', 'pouca', 'poucos', 'poucas',
]);

const AMPLIFIER_WORDS = new Set([
  'muito', 'muita', 'bastante', 'extremamente', 'super', 'mega', 'demais',
  'totalmente', 'completamente', 'absolutamente', 'incrivelmente',
]);

export class SentimentAnalyzer {
  /**
   * Analyze the sentiment of a Portuguese text.
   * Returns a score between -1.0 (very negative) and +1.0 (very positive).
   */
  static analyze(text: string): number {
    if (!text || text.trim().length === 0) return 0;

    const tokens = text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics for broader matching
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);

    let score = 0;
    let wordCount = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const prevToken = i > 0 ? tokens[i - 1] : '';
      const prev2Token = i > 1 ? tokens[i - 2] : '';

      const isNegated = NEGATION_WORDS.has(prevToken) || NEGATION_WORDS.has(prev2Token);
      const isAmplified = AMPLIFIER_WORDS.has(prevToken) || AMPLIFIER_WORDS.has(prev2Token);
      const amplifier = isAmplified ? 1.5 : 1.0;

      if (POSITIVE_WORDS.has(token)) {
        score += isNegated ? -0.5 * amplifier : 1.0 * amplifier;
        wordCount++;
      } else if (NEGATIVE_WORDS.has(token)) {
        score += isNegated ? 0.5 * amplifier : -1.0 * amplifier;
        wordCount++;
      }
    }

    if (wordCount === 0) return 0;

    // Normalize to [-1, 1]
    const raw = score / wordCount;
    return Math.max(-1, Math.min(1, parseFloat(raw.toFixed(3))));
  }

  /**
   * Compute the Experience Score (from the Architecture doc, Section 8.2)
   * score = (rating * 0.7) + (sentiment * 0.3)
   * Normalized to [0, 1]
   */
  static computeExperienceScore(rating: number, sentiment: number): number {
    // rating is 1-5, normalize to 0-1
    const normalizedRating = (rating - 1) / 4;
    // sentiment is already -1 to 1, normalize to 0-1
    const normalizedSentiment = (sentiment + 1) / 2;

    const score = (normalizedRating * 0.7) + (normalizedSentiment * 0.3);
    return parseFloat(score.toFixed(3));
  }
}
