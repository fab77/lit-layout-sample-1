import { LitElement, html, css } from 'lit';
import { widgetsProxy } from './WidgetsProxy.js';

type RowsPayload = {
  sourceId: string;
  headers: string[];
  rows: string[][];
  rowIndexes: number[];
};

type ReceivedRow = {
  sourceId: string;
  row: string[];
};

type ProxyEvent = {
  eventType?: string;
  sourceId?: string;
  headers?: string[];
  rows?: string[][];
  rowIndexes?: number[];
};

export class MapWC extends LitElement {
  static styles = css`
    .map {
      width: 100%;
      height: 300px;
      background-color: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid green;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 6px;
      text-align: left;
    }
    th {
      background: #f5f5f5;
    }
  `;

  static properties = {
    widgetId: { type: String },
    center: { type: String },
    zoom: { type: Number },
    linkedFrom: { type: Object }, // Set
    receivedFrom: { type: String },
    receivedHeaders: { type: Array },
    receivedRows: { type: Array },
    receivedHistory: { type: Array },
  };

  widgetId!: string;
  center!: string;
  zoom!: number;
  linkedFrom: Set<string> = new Set();
  receivedFrom = '';
  receivedHeaders: string[] = [];
  receivedRows: string[][] = [];
  receivedHistory: ReceivedRow[] = [];
  _proxyHandler = (event: ProxyEvent) => this.handleProxyEvent(event);

  connectedCallback() {
    super.connectedCallback();
    if (this.widgetId) {
      widgetsProxy.register(this.widgetId, this);
      widgetsProxy.on(this.widgetId, this._proxyHandler);
      this.linkedFrom = new Set(widgetsProxy.getLinkedSources(this.widgetId));
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.widgetId) {
      widgetsProxy.off(this.widgetId, this._proxyHandler);
      widgetsProxy.unregister(this.widgetId);
    }
  }

  receiveTableRows(payload: RowsPayload): void {
    this.receivedFrom = payload.sourceId;
    this.receivedHeaders = [...payload.headers];
    this.receivedRows = payload.rows.map(row => [...row]);
    this.receivedHistory = [
      ...this.receivedHistory,
      ...payload.rows.map(row => ({ sourceId: payload.sourceId, row: [...row] })),
    ];
  }

  handleProxyEvent(event: ProxyEvent): void {
    if (event.eventType === 'link' && event.sourceId) {
      this.linkedFrom.add(event.sourceId);
      this.requestUpdate();
    }

    if (event.eventType === 'rows-selected' && event.sourceId && Array.isArray(event.rows) && Array.isArray(event.headers)) {
      this.receiveTableRows({
        sourceId: event.sourceId,
        headers: event.headers,
        rows: event.rows,
        rowIndexes: Array.isArray(event.rowIndexes) ? event.rowIndexes : [],
      });
      this.requestUpdate();
    }
  }

  render() {
    return html`
      <div class="map">
        <p>This is MapWC (${this.widgetId})</p>
      </div>
      <p>Linked from: ${Array.from(this.linkedFrom).join(', ')}</p>
      <table>
        <thead>
          <tr>
            <th>Source widget</th>
            ${this.receivedHeaders.map(header => html`<th>${header}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${this.receivedHistory.length > 0
            ? this.receivedHistory.map(entry => html`
                <tr>
                  <td>${entry.sourceId}</td>
                  ${entry.row.map(cell => html`<td>${cell}</td>`)}
                </tr>
              `)
            : html`
                <tr>
                  <td colspan=${Math.max(1, this.receivedHeaders.length + 1)}>No data received yet.</td>
                </tr>
              `}
        </tbody>
      </table>
    `;
  }
}

customElements.define('map-wc', MapWC);
