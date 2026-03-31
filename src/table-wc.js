import { LitElement, html, css } from 'lit';

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
    data: { type: Array },
    headers: { type: Array },
  };

  constructor() {
    super();
    this.data = [['John', '25'], ['Jane', '30']];
    this.headers = ['Name', 'Age'];
  }

  render() {
    return html`
      <p>This is TableWC</p>
      <table>
        <thead>
          <tr>
            ${this.headers.map(header => html`<th>${header}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${this.data.map(row => html`
            <tr>
              ${row.map(cell => html`<td>${cell}</td>`)}
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}

customElements.define('table-wc', TableWC);