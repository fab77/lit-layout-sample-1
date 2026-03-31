import { LitElement, html, css } from "lit";

export class MyElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column; /* header sopra, main sotto */
      height: 100vh;
      border: 2px solid black;
    }
    .app {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: white;
    }

    .header {
      background: #2d3436;
      color: white;
      padding: 20px;
      flex: 0 0 auto; /* altezza fissa */
      position: sticky;
      top: 0;
      z-index: 10;
    }

    button {
      margin-right: 10px;
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #0056b3;
    }

    .main {
      flex: 1 1 auto; /* occupa tutto lo spazio rimanente */
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      overflow-y: auto; /* scroll soltanto contenuto */
      padding: 20px;
      background: #dfe6e9;
      align-items: stretch;
    }

    .main > * {
      flex: 1 1 calc(33.333% - 16px);
      min-width: 250px;
      min-height: 180px;
      box-sizing: border-box;
      position: relative;
    }

    .main > *::before {
      content: attr(data-widget-id);
      position: absolute;
      top: 8px;
      right: 8px;
      background: #ff6b6b;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 100;
    }
  `;

  static properties = {
    name: { type: String },
    widgetCount: { type: Number },
  };

  constructor() {
    super();
    this.name = "World";
    this.widgetCount = 0;
  }

  addTable() {
    const id = `widget-${++this.widgetCount}`;
    const table = document.createElement("table-wc");
    table.setAttribute("data-widget-id", id);
    table.setAttribute("data-widget-type", "table");
    this.shadowRoot.querySelector("main").appendChild(table);
  }

  addMap() {
    const id = `widget-${++this.widgetCount}`;
    const map = document.createElement("map-wc");
    map.setAttribute("data-widget-id", id);
    map.setAttribute("data-widget-type", "map");
    this.shadowRoot.querySelector("main").appendChild(map);
  }

  addImage() {
    const id = `widget-${++this.widgetCount}`;
    const image = document.createElement("image-wc");
    image.src = "https://via.placeholder.com/300";
    image.alt = "Dynamic Image";
    image.setAttribute("data-widget-id", id);
    image.setAttribute("data-widget-type", "image");
    this.shadowRoot.querySelector("main").appendChild(image);
  }

  render() {
    return html`
      <header class="header">
        <div class="add-buttons">
          <button @click=${this.addTable}>Add Table</button>
          <button @click=${this.addMap}>Add Map</button>
          <button @click=${this.addImage}>Add Image</button>
        </div>
      </header>
      <main class="main">
        <!-- Components will be added directly here -->
      </main>
    `;
  }
}

customElements.define("my-element", MyElement);
