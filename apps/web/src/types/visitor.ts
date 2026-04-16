// ── Pulso Cultural — Visitor & ML Feature Store Types ──

export type Gender =
  | 'FEMININO'
  | 'MASCULINO'
  | 'NAO_BINARIO'
  | 'PREFIRO_NAO_DIZER';

export type Origin =
  | 'SALVADOR'
  | 'INTERIOR_BA'
  | 'OUTRO_ESTADO'
  | 'INTERNACIONAL';

export type AccessibilityNeed =
  | 'MOBILIDADE_REDUZIDA'
  | 'BAIXA_VISAO'
  | 'SENSIBILIDADE_SENSORIAL'
  | 'NEURODIVERGENCIA'
  | 'OUTRA';

/**
 * POST /api/v1/users/register
 * Typed payload sent on first-time visitor registration.
 */
export interface RegisterVisitorPayload {
  cpf: string;            // raw 11-digit string
  name: string;
  birthYear: number;
  gender: Gender;
  origin: Origin;
  originDetail?: string;  // city / country for non-Salvador origins
  accessibilityNeeds: AccessibilityNeed[];
  accessibilityDetail?: string; // details if OUTRA is selected
  exhibitionId: string;
  channel: string;
}

/**
 * Feature Store shape consumed by the ML Engine.
 * The API hashes the CPF before storing.
 */
export interface VisitorFeatureRecord {
  cpf_hash: string;       // SHA-256
  identity: {
    gender: Gender;
    origin: Origin;
  };
  accessibility_needs: AccessibilityNeed[];
  first_visit: string;    // ISO timestamp
  visit_context: {
    time_of_day: string;
    crowd_level: string | null;
    event_id: string | null;
  };
}
