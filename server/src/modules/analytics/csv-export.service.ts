import { Response } from 'express';
import { ANALYTICS_CONSTANTS } from './analytics.constants.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ErrorCodes } from '../../shared/errors/error-codes.js';

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => any;
}

export class CsvExportService {
  /**
   * Sanitizes a single cell value against CSV formula injection (DDE attacks)
   * Values starting with =, +, -, @, \t, \r are escaped by prefixing with a single quote.
   */
  sanitizeCell(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    let str = String(value);

    // Formula injection protection
    const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerousPrefixes.some((prefix) => str.startsWith(prefix))) {
      str = `'${str}`;
    }

    // RFC 4180 CSV escaping: if contains comma, quote, or newline, escape inner quotes and wrap in quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Builds full CSV string from headers and records
   */
  generateCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
    if (rows.length > ANALYTICS_CONSTANTS.MAX_EXPORT_ROWS) {
      throw new AppError(
        `Export row count (${rows.length}) exceeds maximum limit of ${ANALYTICS_CONSTANTS.MAX_EXPORT_ROWS}`,
        400,
        ErrorCodes.ERR_ANALYTICS_EXPORT_TOO_LARGE
      );
    }

    const headerLine = columns.map((col) => this.sanitizeCell(col.header)).join(',');
    const dataLines = rows.map((row) =>
      columns.map((col) => this.sanitizeCell(col.accessor(row))).join(',')
    );

    // Prefix with UTF-8 BOM for Microsoft Excel compatibility
    return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  }

  /**
   * Streams CSV directly to Express response with safe Content-Disposition headers
   */
  streamCsvToResponse<T>(
    res: Response,
    filenamePrefix: string,
    columns: CsvColumn<T>[],
    rows: T[]
  ) {
    const csvContent = this.generateCsv(columns, rows);
    const dateStamp = new Date().toISOString().split('T')[0];
    const safeFilename = `${filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_')}-${dateStamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).send(csvContent);
  }
}

export const csvExportService = new CsvExportService();
