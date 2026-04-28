import axios from 'axios';

export interface MLFeatureRecord {
  visitorHash: string;
  birthYear: number;
  gender: string;
  origin: string;
  accessibilityNeeds: string[];
  timestamp: string;
}

export class MLServiceClient {
  private static URL = process.env.ML_ENGINE_URL;

  /**
   * Sends visitor features to the Intelligence Layer's Feature Store.
   * This data is used for learning patterns and adapting the physical/digital environment.
   */
  static async ingestVisitorFeatures(record: MLFeatureRecord): Promise<boolean> {
    if (!this.URL) {
      // Mock branch: silent. Never log the record (it contains sensitive demographic
      // data including health-adjacent accessibilityNeeds — LGPD-03).
      return true;
    }

    try {
      await axios.post(`${this.URL}/v1/features/ingest`, record, {
        timeout: 5000,
      });
      return true;
    } catch (error: any) {
      console.error('[ML_INGEST_ERROR] Failed to send features:', error?.message ?? 'unknown');
      return false;
    }
  }
}
