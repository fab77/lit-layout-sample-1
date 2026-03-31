import { LitElement, html, css } from "lit";

export class MyElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      border: 2px solid black;
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

    dialog {
      padding: 20px;
      border: 2px solid #2d3436;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      min-width: 400px;
    }

    dialog[open] {
      display: block;
    }

    dialog::backdrop {
      background-color: rgba(0, 0, 0, 0.5);
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .dialog-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .dialog-group label {
      font-weight: bold;
      color: #2d3436;
    }

    .dialog-group select {
      padding: 8px;
      border: 1px solid #bdc3c7;
      border-radius: 4px;
      font-size: 14px;
    }

    .dialog-buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 10px;
    }

    .dialog-buttons button {
      padding: 8px 16px;
    }

    .dialog-buttons button:last-child {
      background-color: #27ae60;
    }

    .dialog-buttons button:last-child:hover {
      background-color: #229954;
    }
  `;

  static properties = {
    name: { type: String },
    widgetCount: { type: Number },
    showDialog: { type: Boolean },
    selectedWidgetId: { type: String },
    insertPosition: { type: String },
    pendingWidgetType: { type: String },
  };

  constructor() {
    super();
    this.name = "World";
    this.widgetCount = 0;
    this.showDialog = false;
    this.selectedWidgetId = null;
    this.insertPosition = "left";
    this.pendingWidgetType = null;
  }

  getWidgetsList() {
    const main = this.shadowRoot?.querySelector("main");
    return main ? Array.from(main.children) : [];
  }

  openDialog(type) {
    this.pendingWidgetType = type;
    this.showDialog = true;
    this.selectedWidgetId = null;
    this.insertPosition = "left";
    this.requestUpdate();
    setTimeout(() => {
      const dialog = this.shadowRoot.querySelector("dialog");
      dialog.showModal();
      dialog.querySelector("#widget-select").value = "";
      dialog.querySelector("#position-select").value = "left";
    }, 0);
  }

  closeDialog() {
    this.showDialog = false;
    this.shadowRoot.querySelector("dialog").close();
  }

  confirmAddWidget() {
    const main = this.shadowRoot.querySelector("main");
    const id = `widget-${++this.widgetCount}`;
    let widget;

    if (this.pendingWidgetType === "table") {
      widget = document.createElement("table-wc");
      widget.setAttribute("data-widget-type", "table");
    } else if (this.pendingWidgetType === "map") {
      widget = document.createElement("map-wc");
      widget.setAttribute("data-widget-type", "map");
    } else if (this.pendingWidgetType === "image") {
      widget = document.createElement("image-wc");
      widget.src = "https://via.placeholder.com/300";
      widget.alt = "Dynamic Image";
      widget.setAttribute("data-widget-type", "image");
    }

    widget.setAttribute("data-widget-id", id);

    const referenceWidget = this.selectedWidgetId ? 
      Array.from(main.children).find(w => w.getAttribute("data-widget-id") === this.selectedWidgetId) : 
      null;

    if (!referenceWidget) {
      main.appendChild(widget);
    } else {
      const position = this.insertPosition;
      if (position === "left") {
        referenceWidget.before(widget);
      } else if (position === "right") {
        referenceWidget.after(widget);
      }
    }

    this.closeDialog();
  }

  addTable() {
    this.openDialog("table");
  }

  addMap() {
    this.openDialog("map");
  }

  addImage() {
    this.openDialog("image");
  }

  render() {
    const widgets = this.getWidgetsList();
    const widgetOptions = widgets.map(w => ({
      id: w.getAttribute("data-widget-id"),
      type: w.getAttribute("data-widget-type")
    }));

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

      <dialog>
        <div class="dialog-content">
          <h2>Add ${this.pendingWidgetType?.charAt(0).toUpperCase() + this.pendingWidgetType?.slice(1)}</h2>
          
          <div class="dialog-group">
            <label for="widget-select">Position Reference:</label>
            <select id="widget-select" value=${this.selectedWidgetId || ""} @change=${(e) => this.selectedWidgetId = e.target.value || null}>
              <option value="">At the end (default)</option>
              ${widgetOptions.map(w => html`<option value="${w.id}">${w.id} (${w.type})</option>`)}
            </select>
          </div>

          <div class="dialog-group">
            <label for="position-select">Insert Position:</label>
            <select id="position-select" @change=${(e) => this.insertPosition = e.target.value}>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div class="dialog-buttons">
            <button @click=${() => this.closeDialog()}>Cancel</button>
            <button @click=${() => this.confirmAddWidget()}>Add</button>
          </div>
        </div>
      </dialog>
    `;
  }
}

customElements.define("my-element", MyElement);
