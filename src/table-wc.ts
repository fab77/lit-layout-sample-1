import { LitElement, html, css } from 'lit';
import type { PropertyValues } from 'lit';
import { widgetsProxy } from './WidgetsProxy.js';

type RowsPayload = {
  sourceId: string;
  headers: string[];
  rows: string[][];
  rowIndexes: number[];
};

type TargetWidget = {
  receiveTableRows?: (payload: RowsPayload) => void;
  tableRowsPayload?: RowsPayload;
  requestUpdate?: () => void;
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
    widgetsProxy.link(this.widgetId, this.targetId);
    widgetsProxy.emit(this.widgetId, 'link', { targetId: this.targetId });
    this.links.add(this.targetId);
    this.requestUpdate();
  }

  onTargetChange(e: Event): void {
    this.targetId = (e.target as HTMLInputElement).value;
  }

  onSendTargetChange(e: Event): void {
    this.sendTargetId = (e.target as HTMLSelectElement).value;
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
      this.shownIntoWidgetByRow = this.data.map((_, index) => this.shownIntoWidgetByRow[index] ?? '');
    }
  }

  onRowCheckChange(index: number, e: Event): void {
    const input = e.target as HTMLInputElement;
    const next = [...this.checkedRows];
    next[index] = input.checked;
    this.checkedRows = next;
  }

  sendSelectedRows(): void {
    if (!this.widgetId) return;
    const select = this.shadowRoot?.querySelector('#send-target-select') as HTMLSelectElement | null;
    const selectedTargetId = (select?.value ?? this.sendTargetId).trim();
    if (!selectedTargetId || !this.links.has(selectedTargetId)) return;

    const selectedRowIndexes = this.checkedRows
      .map((isChecked, index) => (isChecked ? index : -1))
      .filter(index => index !== -1);
    if (selectedRowIndexes.length === 0) return;

    const selectedRows = selectedRowIndexes.map(index => this.data[index]);
    const payload: RowsPayload = {
      sourceId: this.widgetId,
      headers: [...this.headers],
      rows: selectedRows,
      rowIndexes: selectedRowIndexes,
    };

    this.sendTargetId = selectedTargetId;

    const targetWidget = widgetsProxy.getWidget(selectedTargetId) as TargetWidget | undefined;
    if (targetWidget && typeof targetWidget.receiveTableRows === 'function') {
      targetWidget.receiveTableRows(payload);
    } else if (targetWidget) {
      targetWidget.tableRowsPayload = payload;
      if (typeof targetWidget.requestUpdate === 'function') {
        targetWidget.requestUpdate();
      }
    }

    widgetsProxy.emit(selectedTargetId, 'rows-selected', payload);

    const nextShownIntoWidgetByRow = [...this.shownIntoWidgetByRow];
    for (const index of selectedRowIndexes) {
      const existing = nextShownIntoWidgetByRow[index] || '';
      const existingIds = existing
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
      if (!existingIds.includes(selectedTargetId)) {
        existingIds.push(selectedTargetId);
      }
      nextShownIntoWidgetByRow[index] = existingIds.join(', ');
    }
    this.shownIntoWidgetByRow = nextShownIntoWidgetByRow;
  }

  render() {
    const hasSelectedRows = this.checkedRows.some(Boolean);

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
        <button @click=${this.sendSelectedRows} ?disabled=${!this.sendTargetId || !hasSelectedRows}>Send rows</button>
      </div>
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
