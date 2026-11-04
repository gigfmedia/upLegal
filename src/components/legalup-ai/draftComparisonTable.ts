// UA-5.1 — contrato único de tablas comparativas del Agent AI.
// El modelo entrega datos estructurados (nunca HTML): aquí se normalizan,
// se acotan y se convierten con escape-first al HTML del editor.
export type ComparisonTableData = {
  title: string;
  columns: string[];
  rows: string[][];
};

export type ComparisonTableLimits = {
  minColumns: number;
  maxColumns: number;
  minRows: number;
  maxRows: number;
  maxCellChars: number;
  maxTitleChars: number;
};

export const COMPARISON_TABLE_LIMITS: ComparisonTableLimits = {
  minColumns: 2,
  maxColumns: 6,
  minRows: 1,
  maxRows: 8,
  maxCellChars: 300,
  maxTitleChars: 160,
};

// Las tablas provenientes de Markdown ya existentes pueden ser más amplias.
// Se acotan igual para no introducir documentos sin límite en el editor.
export const MARKDOWN_TABLE_LIMITS: ComparisonTableLimits = {
  minColumns: 2,
  maxColumns: 12,
  minRows: 1,
  maxRows: 100,
  maxCellChars: 2000,
  maxTitleChars: 200,
};

const DEFAULT_TABLE_TITLE = 'Tabla comparativa';

function normalizeText(value: unknown, maxChars: number): string | null {
  if (typeof value !== 'string') return null;
  const text = Array.from(value)
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code <= 0x1f || code === 0x7f ? ' ' : ch;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length > maxChars) return null;
  return text;
}

export function normalizeComparisonTable(
  value: unknown,
  limits: ComparisonTableLimits = COMPARISON_TABLE_LIMITS
): ComparisonTableData | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as { title?: unknown; columns?: unknown; rows?: unknown };
  if (!Array.isArray(candidate.columns) || !Array.isArray(candidate.rows)) return null;
  if (candidate.columns.length < limits.minColumns || candidate.columns.length > limits.maxColumns) {
    return null;
  }
  if (candidate.rows.length < limits.minRows || candidate.rows.length > limits.maxRows) {
    return null;
  }

  const columns: string[] = [];
  for (const raw of candidate.columns) {
    const cell = normalizeText(raw, limits.maxCellChars);
    if (cell === null || cell.length === 0) return null;
    columns.push(cell);
  }

  const rows: string[][] = [];
  for (const rawRow of candidate.rows) {
    if (!Array.isArray(rawRow) || rawRow.length !== columns.length) return null;
    const row: string[] = [];
    for (const rawCell of rawRow) {
      const cell = normalizeText(rawCell, limits.maxCellChars);
      if (cell === null) return null;
      row.push(cell);
    }
    rows.push(row);
  }

  const rawTitle = normalizeText(candidate.title, limits.maxTitleChars);
  if (rawTitle === null && candidate.title !== undefined && candidate.title !== null && candidate.title !== '') {
    return null;
  }

  return {
    title: rawTitle || DEFAULT_TABLE_TITLE,
    columns,
    rows,
  };
}

export function escapeComparisonCell(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type ComparisonTableHtmlOptions = {
  formatCell?: (value: string) => string;
  includeTitle?: boolean;
  limits?: ComparisonTableLimits;
};

/** Convierte datos ya validados a HTML sin atributos ni nodos del modelo. */
export function comparisonTableToHtml(
  value: unknown,
  options: ComparisonTableHtmlOptions = {}
): string {
  const table = normalizeComparisonTable(value, options.limits ?? COMPARISON_TABLE_LIMITS);
  if (!table) return '';
  const formatCell = options.formatCell ?? escapeComparisonCell;
  const includeTitle = options.includeTitle ?? true;
  const head = table.columns.map((column) => `<th><p>${formatCell(column)}</p></th>`).join('');
  const body = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td><p>${formatCell(cell)}</p></td>`).join('')}</tr>`)
    .join('');
  const title = includeTitle ? `<p><strong>${escapeComparisonCell(table.title)}</strong></p>` : '';
  return `${title}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function comparisonTableToPlainText(value: unknown): string {
  const table = normalizeComparisonTable(value);
  if (!table) return '';
  const lines = [table.title, table.columns.join('\t')];
  for (const row of table.rows) lines.push(row.join('\t'));
  return lines.join('\n');
}
