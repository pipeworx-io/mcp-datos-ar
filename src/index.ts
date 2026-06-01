interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Argentina "Series de Tiempo" MCP — national time-series API (apis.datos.gob.ar).
 *
 * Keyless, official Argentine government statistics (INDEC, BCRA, Subsecretaría de
 * Programación Macroeconómica, etc.). Series titles and descriptions are in Spanish.
 *
 * Typical flow: search_series to find series ids by keyword (e.g. "inflacion",
 * "pbi", "emae", "tipo de cambio"), then get_series to pull the actual observations
 * for one or more ids — optionally resampled (collapse) or transformed
 * (representation_mode).
 */


const BASE = 'https://apis.datos.gob.ar/series/api';
const UA = 'pipeworx-mcp-datos-ar/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_series',
    description:
      'Search Argentina\'s national time-series catalog (apis.datos.gob.ar) for series matching a keyword. ' +
      'Titles/descriptions are in Spanish (e.g. q="inflacion", "pbi", "emae", "tipo de cambio", "desempleo"). ' +
      'Returns matching series with their ids (use these with get_series), titles, units, frequency, ' +
      'date coverage, dataset and source.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Search keyword in Spanish, e.g. "inflacion", "pbi", "tipo de cambio".' },
        limit: { type: 'number', description: 'Max results to return (default 10).' },
        offset: { type: 'number', description: 'Result offset for pagination (default 0).' },
        dataset_theme: { type: 'string', description: 'Optional theme id filter, e.g. "actividad", "precios".' },
        units: { type: 'string', description: 'Optional units filter, e.g. "Porcentaje".' },
      },
      required: ['q'],
    },
  },
  {
    name: 'get_series',
    description:
      'Fetch observations for one or more Argentine time series by id (ids come from search_series). ' +
      'Data is official Argentine statistics; titles are in Spanish. Pass multiple comma-separated ids to ' +
      'align several series on the same dates. Use collapse to resample (e.g. monthly→yearly avg) and ' +
      'representation_mode to transform values (e.g. percent change vs a year ago). Returns rows of ' +
      '[date, value, ...] plus metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'string',
          description: 'One series id, or several comma-separated, e.g. "143.3_NO_PR_2004_A_21". From search_series.',
        },
        start_date: { type: 'string', description: 'Earliest date, ISO YYYY-MM-DD (optional).' },
        end_date: { type: 'string', description: 'Latest date, ISO YYYY-MM-DD (optional).' },
        limit: { type: 'number', description: 'Max rows to return (default 100, API max 1000).' },
        collapse: {
          type: 'string',
          enum: ['month', 'quarter', 'year'],
          description: 'Resample frequency, e.g. "year" to roll monthly data up to yearly.',
        },
        collapse_aggregation: {
          type: 'string',
          enum: ['avg', 'sum', 'end_of_period', 'min', 'max'],
          description: 'How to aggregate when collapsing (default avg).',
        },
        representation_mode: {
          type: 'string',
          enum: ['value', 'change', 'percent_change', 'change_a_year_ago', 'percent_change_a_year_ago'],
          description: 'Value transform: raw value (default), period change, or change vs a year ago.',
        },
        metadata: {
          type: 'string',
          enum: ['none', 'simple', 'full'],
          description: 'Metadata detail level (default simple).',
        },
      },
      required: ['ids'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_series': {
      const params = new URLSearchParams();
      params.set('q', reqStr(args, 'q', '"inflacion"'));
      params.set('limit', String(numOr(args.limit, 10)));
      params.set('offset', String(numOr(args.offset, 0)));
      if (typeof args.dataset_theme === 'string' && args.dataset_theme.trim()) {
        params.set('dataset_theme', args.dataset_theme.trim());
      }
      if (typeof args.units === 'string' && args.units.trim()) params.set('units', args.units.trim());
      return datosGet(`/search/?${params.toString()}`);
    }
    case 'get_series': {
      const params = new URLSearchParams();
      params.set('ids', reqStr(args, 'ids', '"143.3_NO_PR_2004_A_21"'));
      params.set('format', 'json');
      params.set('limit', String(numOr(args.limit, 100)));
      params.set('metadata', enumOr(args.metadata, ['none', 'simple', 'full'], 'simple'));
      if (typeof args.start_date === 'string' && args.start_date.trim()) {
        params.set('start_date', args.start_date.trim());
      }
      if (typeof args.end_date === 'string' && args.end_date.trim()) params.set('end_date', args.end_date.trim());
      if (typeof args.collapse === 'string' && args.collapse.trim()) params.set('collapse', args.collapse.trim());
      if (typeof args.collapse_aggregation === 'string' && args.collapse_aggregation.trim()) {
        params.set('collapse_aggregation', args.collapse_aggregation.trim());
      }
      if (typeof args.representation_mode === 'string' && args.representation_mode.trim()) {
        params.set('representation_mode', args.representation_mode.trim());
      }
      return datosGet(`/series/?${params.toString()}`);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function datosGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`datos.gob.ar: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v.trim();
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function enumOr(v: unknown, allowed: string[], fallback: string): string {
  return typeof v === 'string' && allowed.includes(v) ? v : fallback;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
