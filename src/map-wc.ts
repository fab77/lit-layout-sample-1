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
  rowIndex: number;
  row: string[];
};

type ProxyEvent = {
  eventType?: string;
  sourceId?: string;
  datasetId?: string;
  action?: 'upsert' | 'remove';
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
    dialog {
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 12px;
    }
    .dialog-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
  `;

  static properties = {
    widgetId: { type: String },
    center: { type: String },
    zoom: { type: Number },
    linkedFrom: { type: Object }, // Set
    receivedHeaders: { type: Array },
    receivedHistory: { type: Array },
    contextRow: { type: Object },
  };

  widgetId!: string;
  center!: string;
  zoom!: number;
  linkedFrom: Set<string> = new Set();
  receivedHeaders: string[] = [];
  receivedHistory: ReceivedRow[] = [];
  contextRow: ReceivedRow | null = null;
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
    const nextDatasetRows = payload.rows.map((row, index) => ({
      sourceId: payload.sourceId,
      datasetId: payload.datasetId,
      rowIndex: payload.rowIndexes[index] ?? -1,
      row: [...row],
    }));
    this.receivedHistory = [...withoutDataset, ...nextDatasetRows];
  }

  handleProxyEvent(event: ProxyEvent): void {
    if (event.eventType === 'link' && event.sourceId) {
      this.linkedFrom.add(event.sourceId);
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

  onRowContextMenu(e: MouseEvent, entry: ReceivedRow): void {
    e.preventDefault();
    this.contextRow = entry;
    const dialog = this.shadowRoot?.querySelector('#row-actions-dialog') as HTMLDialogElement | null;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  closeRowActionsDialog(): void {
    const dialog = this.shadowRoot?.querySelector('#row-actions-dialog') as HTMLDialogElement | null;
    if (dialog?.open) {
      dialog.close();
    }
  }

  removeFromCurrentDataset(): void {
    if (!this.contextRow) return;
    const current = this.contextRow;
    this.receivedHistory = this.receivedHistory.filter(
      entry => !(
        entry.sourceId === current.sourceId
        && entry.datasetId === current.datasetId
        && entry.rowIndex === current.rowIndex
      ),
    );

    if (current.rowIndex >= 0 && this.widgetId) {
      widgetsProxy.emit(current.sourceId, 'dataset-row-removed', {
        targetId: this.widgetId,
        datasetId: current.datasetId,
        rowIndex: current.rowIndex,
      });
    }
    this.closeRowActionsDialog();
  }

  showOnSourceTable(): void {
    if (!this.contextRow || this.contextRow.rowIndex < 0) return;
    widgetsProxy.emit(this.contextRow.sourceId, 'focus-row', {
      datasetId: this.contextRow.datasetId,
      rowIndex: this.contextRow.rowIndex,
    });
    this.closeRowActionsDialog();
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
            <th>Dataset ID</th>
            ${this.receivedHeaders.map(header => html`<th>${header}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${this.receivedHistory.length > 0
            ? this.receivedHistory.map(entry => html`
                <tr @contextmenu=${(e: MouseEvent) => this.onRowContextMenu(e, entry)}>
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
      <dialog id="row-actions-dialog">
        <p>Dataset row actions</p>
        ${this.contextRow ? html`<p>Source: ${this.contextRow.sourceId}, Dataset: ${this.contextRow.datasetId}</p>` : ''}
        <div class="dialog-actions">
          <button @click=${this.removeFromCurrentDataset}>1. Remove from current dataset</button>
          <button @click=${this.showOnSourceTable}>2. Show on source table</button>
          <button @click=${this.closeRowActionsDialog}>Close</button>
        </div>
      </dialog>
    `;
  }
}

customElements.define('map-wc', MapWC);
