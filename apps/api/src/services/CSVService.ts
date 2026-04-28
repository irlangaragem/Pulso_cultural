interface ReportSection {
  title: string;
  rows: Array<Record<string, unknown>>;
}

interface ReportInput {
  title: string;
  generatedAt: string;
  totals: Record<string, number | string>;
  sections: ReportSection[];
}

function escapeCell(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val);
  // CSV-safe: wrap in quotes; double internal quotes (RFC 4180).
  return `"${s.replace(/"/g, '""')}"`;
}

export class CSVService {
  static jsonToCSV(data: any[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.map(escapeCell).join(',')];
    for (const row of data) {
      csvRows.push(headers.map(h => escapeCell(row[h])).join(','));
    }
    return csvRows.join('\n');
  }

  /**
   * Multi-section report. Always emits header + totals + at least the section
   * titles, even when individual sections are empty — so the file is never
   * truly blank and the user always has context.
   * UTF-8 BOM is prepended so Excel opens it without mojibake.
   */
  static buildReport(input: ReportInput): string {
    const lines: string[] = [];
    lines.push(escapeCell(input.title));
    lines.push(escapeCell(`Gerado em ${input.generatedAt}`));
    lines.push('');

    lines.push(escapeCell('TOTAIS'));
    lines.push(['chave', 'valor'].map(escapeCell).join(','));
    for (const [k, v] of Object.entries(input.totals)) {
      lines.push([escapeCell(k), escapeCell(v)].join(','));
    }
    lines.push('');

    for (const section of input.sections) {
      lines.push(escapeCell(section.title.toUpperCase()));
      if (section.rows.length === 0) {
        lines.push(escapeCell('(sem dados)'));
        lines.push('');
        continue;
      }
      const headers = Object.keys(section.rows[0]);
      lines.push(headers.map(escapeCell).join(','));
      for (const row of section.rows) {
        lines.push(headers.map(h => escapeCell(row[h])).join(','));
      }
      lines.push('');
    }

    // BOM ensures Excel opens UTF-8 cleanly (without it, accented chars break).
    return '﻿' + lines.join('\n');
  }
}
