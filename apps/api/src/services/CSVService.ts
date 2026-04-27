export class CSVService {
  static jsonToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','), // header row
    ];

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}
