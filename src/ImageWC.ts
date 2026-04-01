import { LitElement, html, css } from 'lit';
import { widgetsProxy } from './WidgetsProxy.js';

type RowsPayload = {
  sourceId: string;
  datasetId: string;
  action: 'upsert' | 'remove';
  headers: string[];
  rows: string[][];
  rowIndexes: number[];
};

type ReceivedRow = {
  sourceId: string;
  datasetId: string;
  row: string[];
};

type ProxyEvent = {
  eventType?: string;
  sourceId?: string;
  targetId?: string;
  datasetId?: string;
  action?: 'upsert' | 'remove';
  headers?: string[];
  rows?: string[][];
  rowIndexes?: number[];
};

export class ImageWC extends LitElement {
  static styles = css`
    :host {
      border: 1px solid yellow;
      display: block;
    }
    img {
      max-width: 100%;
      height: auto;
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
    .unlink-btn {
      margin-left: 8px;
    }
  `;

  static properties = {
    widgetId: { type: String },
    src: { type: String },
    alt: { type: String },
    linkedFrom: { type: Object }, // Set
    receivedHeaders: { type: Array },
    receivedHistory: { type: Array },
  };

  widgetId!: string;
  src!: string;
  alt!: string;
  linkedFrom: Set<string> = new Set();
  receivedHeaders: string[] = [];
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
    const datasetKey = `${payload.sourceId}::${payload.datasetId}`;

    if (payload.action === 'remove') {
      this.receivedHistory = this.receivedHistory.filter(
        entry => `${entry.sourceId}::${entry.datasetId}` !== datasetKey,
      );
      return;
    }

    this.receivedHeaders = [...payload.headers];
    const withoutDataset = this.receivedHistory.filter(
      entry => `${entry.sourceId}::${entry.datasetId}` !== datasetKey,
    );
    const nextDatasetRows = payload.rows.map(row => ({
      sourceId: payload.sourceId,
      datasetId: payload.datasetId,
      row: [...row],
    }));
    this.receivedHistory = [...withoutDataset, ...nextDatasetRows];
  }

  handleProxyEvent(event: ProxyEvent): void {
    if (event.eventType === 'link' && event.sourceId) {
      this.linkedFrom.add(event.sourceId);
      this.requestUpdate();
    }

    if (event.eventType === 'unlinked' && event.sourceId) {
      this.linkedFrom.delete(event.sourceId);
      this.receivedHistory = this.receivedHistory.filter(entry => entry.sourceId !== event.sourceId);
      if (this.receivedHistory.length === 0) {
        this.receivedHeaders = [];
      }
      this.requestUpdate();
    }

    if (
      event.eventType === 'rows-selected'
      && event.sourceId
      && event.datasetId
      && event.action
      && Array.isArray(event.rows)
      && Array.isArray(event.headers)
    ) {
      this.receiveTableRows({
        sourceId: event.sourceId,
        datasetId: event.datasetId,
        action: event.action,
        headers: event.headers,
        rows: event.rows,
        rowIndexes: Array.isArray(event.rowIndexes) ? event.rowIndexes : [],
      });
      this.requestUpdate();
    }
  }

  unlinkSource(sourceId: string): void {
    if (!this.widgetId) return;
    const unlinked = widgetsProxy.unlink(sourceId, this.widgetId);
    if (!unlinked) return;

    this.linkedFrom.delete(sourceId);
    this.receivedHistory = this.receivedHistory.filter(entry => entry.sourceId !== sourceId);
    if (this.receivedHistory.length === 0) {
      this.receivedHeaders = [];
    }

    widgetsProxy.emit(sourceId, 'unlinked', { sourceId, targetId: this.widgetId });
    this.requestUpdate();
  }

  render() {
    const linkedFromList = Array.from(this.linkedFrom);

    return html`
      <p>This is ImageWC (${this.widgetId})</p>
      <img src="${this.src}" alt="${this.alt}" />
      <p>
        Linked from:
        ${linkedFromList.length > 0
          ? linkedFromList.map(sourceId => html`
              <span>${sourceId}</span>
              <button class="unlink-btn" @click=${() => this.unlinkSource(sourceId)}>Unlink</button>
            `)
          : '-'}
      </p>
      <table>
        <thead>
          <tr>
            <th>Source widget</th>
            <th>Dataset ID</th>
            ${this.receivedHeaders.map(header => html`<th>${header}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${this.receivedHistory.length > 0
            ? this.receivedHistory.map(entry => html`
                <tr>
                  <td>${entry.sourceId}</td>
                  <td>${entry.datasetId}</td>
                  ${entry.row.map(cell => html`<td>${cell}</td>`)}
                </tr>
              `)
            : html`
                <tr>
                  <td colspan=${Math.max(2, this.receivedHeaders.length + 2)}>No data received yet.</td>
                </tr>
              `}
        </tbody>
      </table>
    `;
  }
}

customElements.define('image-wc', ImageWC);
