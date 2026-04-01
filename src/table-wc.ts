import { LitElement, html, css } from 'lit';
import type { PropertyValues } from 'lit';
import { widgetsProxy } from './WidgetsProxy.js';

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
    links: { type: Object }, // Set
  };

  widgetId!: string;
  data: string[][] = [["Alice", "30", "New York"], ["Bob", "25", "Los Angeles"], ["Charlie", "35", "Chicago"]];
  headers: string[] = ["Name", "Age", "City"];
  checkedRows: boolean[] = [];
  links: Set<string> = new Set();
  targetId = '';

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

  updated(changedProperties: PropertyValues<this>) {
    if (changedProperties.has('widgetId')) {
      if (this.widgetId) {
        widgetsProxy.register(this.widgetId, this);
        this.links = new Set(widgetsProxy.getLinkedTargets(this.widgetId));
      }
    }

    if (changedProperties.has('data')) {
      this.checkedRows = this.data.map((_, index) => this.checkedRows[index] ?? false);
    }
  }

  onRowCheckChange(index: number, e: Event): void {
    const input = e.target as HTMLInputElement;
    const next = [...this.checkedRows];
    next[index] = input.checked;
    this.checkedRows = next;
  }

  render() {
    return html`
      <p>This is TableWC (${this.widgetId})</p>
      <div>
        <label for="target-id-input">Link to widget id:</label>
        <input id="target-id-input" .value=${this.targetId} @input=${this.onTargetChange} placeholder="widget-2" />
        <button @click=${this.linkTarget}>Link</button>
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
              <td>${this.checkedRows[index] ? this.widgetId : ''}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}

customElements.define('table-wc', TableWC);
