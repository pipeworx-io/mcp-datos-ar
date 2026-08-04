# mcp-datos-ar

Argentina "Series de Tiempo" MCP — national time-series API (apis.datos.gob.ar).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_series` | Search Argentina's national time-series catalog (apis.datos.gob.ar) for series matching a keyword. Titles/descriptions are in Spanish (e.g. q="inflacion", "pbi", "emae", "tipo de cambio", "desempleo"). Returns matching series with their ids (use these with get_series), titles, units, frequency, date coverage, dataset and source. |
| `get_series` | Fetch observations for one or more Argentine time series by id (ids come from search_series). Data is official Argentine statistics; titles are in Spanish. Pass multiple comma-separated ids to align several series on the same dates. Use collapse to resample (e.g. monthly→yearly avg) and representation_mode to transform values (e.g. percent change vs a year ago). Returns rows of [date, value, ...] plus metadata. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "datos-ar": {
      "url": "https://gateway.pipeworx.io/datos-ar/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Datos Ar data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
