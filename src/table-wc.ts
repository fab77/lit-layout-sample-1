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

  connectedCallback() {
    super.connectedCallback();
    if (this.widgetId) {
      widgetsProxy.register(this.widgetId, this);
      this.links = new Set(widgetsProxy.getLinkedTargets(this.widgetId));
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.widgetId) {
      widgetsProxy.unregister(this.widgetId);
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

  updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('widgetId')) {
      if (this.widgetId) {
        widgetsProxy.register(this.widgetId, this);
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

  onRowCheckChange(index: number, e: Event): void {
    const input = e.target as HTMLInputElement;
    const next = [...this.checkedRows];
    next[index] = input.checked;
    this.checkedRows = next;
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
    const hasDatasetId = this.datasetIdInput.trim().length > 0;
    const selectedTargetDatasetIds = this.sentDatasets
      .filter(dataset => dataset.targetId === this.sendTargetId)
      .map(dataset => dataset.datasetId);

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
      <p>Existing dataset IDs for target: ${selectedTargetDatasetIds.join(', ') || '-'}</p>
      <p>Linked to: ${Array.from(this.links).join(', ')}</p>
      <table>
        <thead>
          <tr>
            <th>Select</th>
            ${this.headers.map(header => html`<th>${header}</th>`)}
            <th>Shown into widget</th>
          </tr>
        </thead>
        <tbody>
          ${this.data.map((row, index) => html`
            <tr>
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
