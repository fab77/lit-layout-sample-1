import { LitElement, html, css } from 'lit';
import type { PropertyValues } from 'lit';
import { widgetsProxy } from './WidgetsProxy.js';

type RowsPayload = {
  sourceId: string;
  datasetId: string;
  action: 'upsert' | 'remove';
  headers: string[];
  rows: string[][];
  rowIndexes: number[];
};

type ProxyEvent = {
  eventType?: string;
  targetId?: string;
  datasetId?: string;
  rowIndex?: number;
};

type SentDataset = {
  targetId: string;
  datasetId: string;
  rowIndexes: number[];
};

export class TableWC extends LitElement {
  static styles = css`
    :host {
      border: 1px solid red;
      display: block;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr.highlight-row {
      background-color: #fff5cc;
      transition: background-color 0.2s ease-in-out;
    }
    .dataset-chip {
      background: none;
      border: none;
      color: #0b57d0;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
      margin-right: 8px;
    }
  `;

  static properties = {
    widgetId: { type: String },
    data: { type: Array },
    headers: { type: Array },
    checkedRows: { type: Array },
    shownIntoWidgetByRow: { type: Array },
    sendTargetId: { type: String },
    datasetIdInput: { type: String },
    sentDatasets: { type: Array },
    highlightedRowIndex: { type: Number },
    links: { type: Object }, // Set
  };

  widgetId!: string;
  data: string[][] = [["Alice", "30", "New York"], ["Bob", "25", "Los Angeles"], ["Charlie", "35", "Chicago"]];
  headers: string[] = ["Name", "Age", "City"];
  checkedRows: boolean[] = [];
  shownIntoWidgetByRow: string[] = [];
  links: Set<string> = new Set();
  targetId = '';
  sendTargetId = '';
  datasetIdInput = '';
  sentDatasets: SentDataset[] = [];
  highlightedRowIndex = -1;
  _highlightTimer: ReturnType<typeof setTimeout> | undefined;
  _proxyHandler = (event: ProxyEvent) => this.handleProxyEvent(event);

  connectedCallback() {
    super.connectedCallback();
    if (this.widgetId) {
      widgetsProxy.register(this.widgetId, this);
      widgetsProxy.on(this.widgetId, this._proxyHandler);
      this.links = new Set(widgetsProxy.getLinkedTargets(this.widgetId));
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.widgetId) {
      widgetsProxy.off(this.widgetId, this._proxyHandler);
      widgetsProxy.unregister(this.widgetId);
    }
    if (this._highlightTimer) {
      clearTimeout(this._highlightTimer);
    }
  }

  linkTarget(): void {
    if (!this.widgetId || !this.targetId || this.widgetId === this.targetId || !widgetsProxy.hasWidget(this.targetId) || this.links.has(this.targetId)) return;
    const isLinked = widgetsProxy.link(this.widgetId, this.targetId);
    if (!isLinked) return;
    widgetsProxy.emit(this.targetId, 'link', { sourceId: this.widgetId });
    this.links.add(this.targetId);
    this.requestUpdate();
  }

  onTargetChange(e: Event): void {
    this.targetId = (e.target as HTMLInputElement).value;
  }

  onSendTargetChange(e: Event): void {
    this.sendTargetId = (e.target as HTMLSelectElement).value;
  }

  onDatasetIdInputChange(e: Event): void {
    this.datasetIdInput = (e.target as HTMLInputElement).value;
  }

  selectExistingDataset(targetId: string, datasetId: string): void {
    if (targetId === 'none' || datasetId === 'none') {
      this.datasetIdInput = '';
      this.checkedRows = this.data.map(() => false);
      return;
    }

    const selectedTargetId = targetId.trim();
    if (!selectedTargetId) return;

    const dataset = this.sentDatasets.find(
      entry => entry.targetId === selectedTargetId && entry.datasetId === datasetId,
    );
    if (!dataset) return;

    this.sendTargetId = selectedTargetId;
    this.datasetIdInput = datasetId;
    this.checkedRows = this.data.map((_, index) => dataset.rowIndexes.includes(index));
  }

  updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('widgetId')) {
      if (this.widgetId) {
        widgetsProxy.register(this.widgetId, this);
        widgetsProxy.on(this.widgetId, this._proxyHandler);
        this.links = new Set(widgetsProxy.getLinkedTargets(this.widgetId));
        if (!this.links.has(this.sendTargetId)) {
          this.sendTargetId = '';
        }
      }
    }

    if (changedProperties.has('data')) {
      this.checkedRows = this.data.map((_, index) => this.checkedRows[index] ?? false);
      this.rebuildShownIntoWidgetByRow();
    }
  }

  handleProxyEvent(event: ProxyEvent): void {
    if (event.eventType === 'focus-row' && typeof event.rowIndex === 'number') {
      this.focusAndHighlightRow(event.rowIndex);
      return;
    }

    if (
      event.eventType === 'dataset-row-removed'
      && event.targetId
      && event.datasetId
      && typeof event.rowIndex === 'number'
    ) {
      this.removeRowFromDataset(event.targetId, event.datasetId, event.rowIndex);
    }
  }

  removeRowFromDataset(targetId: string, datasetId: string, rowIndex: number): void {
    const next = this.sentDatasets
      .map(dataset => {
        if (dataset.targetId !== targetId || dataset.datasetId !== datasetId) {
          return dataset;
        }
        return {
          ...dataset,
          rowIndexes: dataset.rowIndexes.filter(index => index !== rowIndex),
        };
      })
      .filter(dataset => dataset.rowIndexes.length > 0);

    this.sentDatasets = next;
    this.rebuildShownIntoWidgetByRow();
  }

  async focusAndHighlightRow(rowIndex: number): Promise<void> {
    this.highlightedRowIndex = rowIndex;
    this.requestUpdate();
    await this.updateComplete;
    const row = this.shadowRoot?.querySelector(`tr[data-row-index="${rowIndex}"]`) as HTMLTableRowElement | null;
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (this._highlightTimer) {
      clearTimeout(this._highlightTimer);
    }
    this._highlightTimer = setTimeout(() => {
      this.highlightedRowIndex = -1;
      this.requestUpdate();
    }, 2000);
  }

  onRowCheckChange(index: number, e: Event): void {
    const input = e.target as HTMLInputElement;
    const next = [...this.checkedRows];
    next[index] = input.checked;
    this.checkedRows = next;
  }

  onToggleAllRows(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.checkedRows = this.data.map(() => input.checked);
  }

  rebuildShownIntoWidgetByRow(): void {
    const next = this.data.map(() => '');

    for (const dataset of this.sentDatasets) {
      const label = `${dataset.targetId} (${dataset.datasetId})`;
      for (const index of dataset.rowIndexes) {
        if (index < 0 || index >= next.length) continue;
        const existing = next[index]
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
        if (!existing.includes(label)) {
          existing.push(label);
        }
        next[index] = existing.join(', ');
      }
    }

    this.shownIntoWidgetByRow = next;
  }

  sendSelectedRows(): void {
    if (!this.widgetId) return;
    const select = this.shadowRoot?.querySelector('#send-target-select') as HTMLSelectElement | null;
    const selectedTargetId = (select?.value ?? this.sendTargetId).trim();
    const datasetId = this.datasetIdInput.trim();
    if (!selectedTargetId || !this.links.has(selectedTargetId) || !datasetId) return;

    const selectedRowIndexes = this.checkedRows
      .map((isChecked, index) => (isChecked ? index : -1))
      .filter(index => index !== -1);
    if (selectedRowIndexes.length === 0) return;

    const selectedRows = selectedRowIndexes.map(index => this.data[index]);
    const payload: RowsPayload = {
      sourceId: this.widgetId,
      datasetId,
      action: 'upsert',
      headers: [...this.headers],
      rows: selectedRows,
      rowIndexes: selectedRowIndexes,
    };

    this.sendTargetId = selectedTargetId;

    widgetsProxy.emit(selectedTargetId, 'rows-selected', payload);

    const datasetIndex = this.sentDatasets.findIndex(
      dataset => dataset.targetId === selectedTargetId && dataset.datasetId === datasetId,
    );
    const nextSentDatasets = [...this.sentDatasets];
    if (datasetIndex >= 0) {
      nextSentDatasets[datasetIndex] = {
        ...nextSentDatasets[datasetIndex],
        rowIndexes: selectedRowIndexes,
      };
    } else {
      nextSentDatasets.push({ targetId: selectedTargetId, datasetId, rowIndexes: selectedRowIndexes });
    }
    this.sentDatasets = nextSentDatasets;
    this.rebuildShownIntoWidgetByRow();
  }

  removeDataset(): void {
    if (!this.widgetId) return;
    const selectedTargetId = this.sendTargetId.trim();
    const datasetId = this.datasetIdInput.trim();
    if (!selectedTargetId || !datasetId || !this.links.has(selectedTargetId)) return;

    const payload: RowsPayload = {
      sourceId: this.widgetId,
      datasetId,
      action: 'remove',
      headers: [...this.headers],
      rows: [],
      rowIndexes: [],
    };

    widgetsProxy.emit(selectedTargetId, 'rows-selected', payload);
    this.sentDatasets = this.sentDatasets.filter(
      dataset => !(dataset.targetId === selectedTargetId && dataset.datasetId === datasetId),
    );
    this.rebuildShownIntoWidgetByRow();
  }

  render() {
    const hasSelectedRows = this.checkedRows.some(Boolean);
    const allRowsSelected = this.data.length > 0 && this.checkedRows.every(Boolean);
    const someRowsSelected = this.checkedRows.some(Boolean) && !allRowsSelected;
    const hasDatasetId = this.datasetIdInput.trim().length > 0;
    const existingDatasets = this.sentDatasets.map(dataset => ({
      targetId: dataset.targetId,
      datasetId: dataset.datasetId,
      label: `${dataset.targetId} : ${dataset.datasetId}`,
    }));

    return html`
      <p>This is TableWC (${this.widgetId})</p>
      <div>
        <label for="target-id-input">Link to widget id:</label>
        <input id="target-id-input" .value=${this.targetId} @input=${this.onTargetChange} placeholder="widget-2" />
        <button @click=${this.linkTarget}>Link</button>
      </div>
      <div>
        <label for="send-target-select">Send selected rows to:</label>
        <select id="send-target-select" .value=${this.sendTargetId} @change=${this.onSendTargetChange}>
          <option value="">Select linked widget</option>
          ${Array.from(this.links).map(linkedId => html`<option value=${linkedId}>${linkedId}</option>`)}
        </select>
      </div>
      <div>
        <label for="dataset-id-input">Dataset ID:</label>
        <input
          id="dataset-id-input"
          .value=${this.datasetIdInput}
          @input=${this.onDatasetIdInputChange}
          placeholder="e.g. city-over-30"
        />
        <button @click=${this.sendSelectedRows} ?disabled=${!this.sendTargetId || !hasSelectedRows || !hasDatasetId}>Send/Update dataset</button>
        <button @click=${this.removeDataset} ?disabled=${!this.sendTargetId || !hasDatasetId}>Remove dataset</button>
      </div>
      <p>
        Existing dataset IDs:
        <button type="button" class="dataset-chip" @click=${() => this.selectExistingDataset('none', 'none')}>
          none
        </button>
        ${existingDatasets.length > 0
          ? existingDatasets.map(dataset => html`
              <button
                type="button"
                class="dataset-chip"
                @click=${() => this.selectExistingDataset(dataset.targetId, dataset.datasetId)}
              >
                ${dataset.label}
              </button>
            `)
          : html` - `}
      </p>
      <p>Linked to: ${Array.from(this.links).join(', ')}</p>
      <table>
        <thead>
          <tr>
            <th>
              Select
              <input
                type="checkbox"
                ?checked=${allRowsSelected}
                .indeterminate=${someRowsSelected}
                @change=${this.onToggleAllRows}
              />
            </th>
            ${this.headers.map(header => html`<th>${header}</th>`)}
            <th>Shown into widget</th>
          </tr>
        </thead>
        <tbody>
          ${this.data.map((row, index) => html`
            <tr data-row-index=${index} class=${this.highlightedRowIndex === index ? 'highlight-row' : ''}>
              <td>
                <input
                  type="checkbox"
                  .checked=${this.checkedRows[index] ?? false}
                  @change=${(e: Event) => this.onRowCheckChange(index, e)}
                />
              </td>
              ${row.map(cell => html`<td>${cell}</td>`)}
              <td>${this.shownIntoWidgetByRow[index] || ''}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}

customElements.define('table-wc', TableWC);
