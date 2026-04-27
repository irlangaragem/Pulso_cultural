import { describe, it, expect } from 'vitest';
import { SentimentAnalyzer } from '../../../src/services/SentimentAnalyzer';

describe('SentimentAnalyzer', () => {
  describe('analyze()', () => {
    it('deve retornar 0 para string vazia', () => {
      expect(SentimentAnalyzer.analyze('')).toBe(0);
    });

    it('deve retornar 0 para string apenas com espaços', () => {
      expect(SentimentAnalyzer.analyze('   ')).toBe(0);
    });

    it('deve retornar 0 para texto neutro sem palavras de sentimento', () => {
      expect(SentimentAnalyzer.analyze('O museu fica na rua principal')).toBe(0);
    });

    it('deve retornar score positivo para texto positivo', () => {
      const score = SentimentAnalyzer.analyze('Exposição maravilhosa, adorei muito!');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('deve retornar score negativo para texto negativo', () => {
      const score = SentimentAnalyzer.analyze('Terrível, decepcionante e confuso');
      expect(score).toBeLessThan(0);
      expect(score).toBeGreaterThanOrEqual(-1);
    });

    it('deve tratar negação — "não gostei" deve ser negativo', () => {
      const negated = SentimentAnalyzer.analyze('não gostei');
      expect(negated).toBeLessThan(0);
    });

    it('deve inverter negação de palavra negativa — "não é ruim" deve ser positivo', () => {
      const negated = SentimentAnalyzer.analyze('não é ruim');
      expect(negated).toBeGreaterThan(0);
    });

    it('deve amplificar palavras positivas — "muito bom" ≥ "bom" em contexto', () => {
      const simples = SentimentAnalyzer.analyze('o museu é bom para visitar');
      const amplificado = SentimentAnalyzer.analyze('o museu é muito bom para visitar');
      expect(amplificado).toBeGreaterThanOrEqual(simples);
    });

    it('deve amplificar palavras negativas — "muito ruim" ≤ "ruim" em contexto', () => {
      const simples = SentimentAnalyzer.analyze('o museu é ruim para visitar');
      const amplificado = SentimentAnalyzer.analyze('o museu é muito ruim para visitar');
      expect(amplificado).toBeLessThanOrEqual(simples);
    });

    it('deve tratar caracteres acentuados corretamente', () => {
      const score = SentimentAnalyzer.analyze('Fantástico e incrível');
      expect(score).toBeGreaterThan(0);
    });

    it('deve retornar score balanceado para sentimentos mistos', () => {
      const score = SentimentAnalyzer.analyze('Bom conteúdo mas organização terrível');
      expect(Math.abs(score)).toBeLessThan(0.6);
    });

    it('deve limitar o score ao intervalo [-1, 1]', () => {
      const extremoPositivo = SentimentAnalyzer.analyze(
        'excelente incrível fantástico maravilhoso extraordinário espetacular'
      );
      expect(extremoPositivo).toBeLessThanOrEqual(1);
      expect(extremoPositivo).toBeGreaterThanOrEqual(-1);
    });

    it('deve reconhecer vocabulário cultural de museu', () => {
      const score = SentimentAnalyzer.analyze('A arte é inspiradora e enriquecedora');
      expect(score).toBeGreaterThan(0);
    });

    it('deve detectar reclamações de acessibilidade', () => {
      const score = SentimentAnalyzer.analyze('Inacessível, muitos degraus e barreiras');
      expect(score).toBeLessThan(0);
    });
  });

  describe('computeExperienceScore()', () => {
    it('deve retornar 0 para rating=1 e sentiment=-1 (pior caso)', () => {
      expect(SentimentAnalyzer.computeExperienceScore(1, -1)).toBe(0);
    });

    it('deve retornar 1.0 para rating=5 e sentiment=1 (melhor caso)', () => {
      expect(SentimentAnalyzer.computeExperienceScore(5, 1)).toBe(1);
    });

    it('deve retornar 0.5 para rating=3 e sentiment=0 (ponto neutro)', () => {
      expect(SentimentAnalyzer.computeExperienceScore(3, 0)).toBe(0.5);
    });

    it('deve pesar rating mais que sentiment (proporção 70/30)', () => {
      const altoRatingBaixoSentiment = SentimentAnalyzer.computeExperienceScore(5, -0.5);
      const baixoRatingAltoSentiment = SentimentAnalyzer.computeExperienceScore(2, 1);
      expect(altoRatingBaixoSentiment).toBeGreaterThan(baixoRatingAltoSentiment);
    });

    it('deve sempre retornar valor entre 0 e 1', () => {
      for (let rating = 1; rating <= 5; rating++) {
        for (const sentiment of [-1, -0.5, 0, 0.5, 1]) {
          const score = SentimentAnalyzer.computeExperienceScore(rating, sentiment);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        }
      }
    });
  });
});
