import { LitElement, html, css } from "lit";

type WidgetHostElement = HTMLElement & { widgetId?: string };

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
      flex: 0 0 auto;
      width: calc(33.333% - 16px);
      min-width: 250px;
      min-height: 180px;
      box-sizing: border-box;
      position: relative;
      resize: both;
      overflow: auto;
    }

    .main > *[data-widget-size="full-row"] {
      flex: 0 0 calc(100% - 16px);
      width: calc(100% - 16px);
      min-width: 100%;
    }

    .main > *[data-widget-size="full-column"] {
      min-height: calc(100% - 40px);
      width: auto;
      flex: 0 0 auto;
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

    .drag-over {
      outline: 3px dashed #0984e3;
      outline-offset: -3px;
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
    selectedSize: { type: String },
  };

  name!: string;
  widgetCount: number = 0;
  showDialog!: boolean;
  selectedWidgetId!: string | null;
  insertPosition!: string;
  pendingWidgetType!: string | null;
  selectedSize!: string;

  getWidgetsList(): HTMLElement[] {
    const main = this.shadowRoot?.querySelector("main");
    return main ? Array.from(main.children) as HTMLElement[] : [];
  }

  openDialog(type: string): void {
    this.pendingWidgetType = type;
    this.showDialog = true;
    this.selectedWidgetId = null;
    this.insertPosition = "left";
    this.selectedSize = "normal";
    this.requestUpdate();
    setTimeout(() => {
      const dialog = this.shadowRoot!.querySelector("dialog") as HTMLDialogElement;
      dialog.showModal();
      (dialog.querySelector("#widget-select") as HTMLSelectElement).value = "";
      (dialog.querySelector("#position-select") as HTMLSelectElement).value = "left";
      (dialog.querySelector("#size-select") as HTMLSelectElement).value = "normal";
    }, 0);
  }

  closeDialog(): void {
    this.showDialog = false;
    (this.shadowRoot!.querySelector("dialog") as HTMLDialogElement).close();
  }

  confirmAddWidget(): void {
    if (!this.pendingWidgetType) return;
    if (!this.shadowRoot) return;
    const main = this.shadowRoot.querySelector("main");
    const id = `widget-${++this.widgetCount}`;
    let widget: WidgetHostElement | null = null;

    if (this.pendingWidgetType === "table") {
      widget = document.createElement("table-wc");
      widget.setAttribute("data-widget-type", "table");
    } else if (this.pendingWidgetType === "map") {
      widget = document.createElement("map-wc");
      widget.setAttribute("data-widget-type", "map");
    } else if (this.pendingWidgetType === "image") {
      widget = document.createElement("image-wc");
      widget.setAttribute("src", "https://via.placeholder.com/300");
      widget.setAttribute("alt", "Dynamic Image");
      widget.setAttribute("data-widget-type", "image");
    }
    if (!widget || !main) return;

    widget.setAttribute("data-widget-id", id);
    widget.setAttribute("data-widget-size", this.selectedSize || "normal");
    if ("widgetId" in widget) {
      widget.widgetId = id;
    }

    const referenceWidget = this.selectedWidgetId ? 
      Array.from(main.children).find(w => w.getAttribute("data-widget-id") === this.selectedWidgetId) : 
      null;

    widget.setAttribute("draggable", "true");
    this.addDragHandlers(widget);

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

  addTable(): void {
    this.openDialog("table");
  }

  addMap(): void {
    this.openDialog("map");
  }

  addImage(): void {
    this.openDialog("image");
  }

  addDragHandlers(widget: WidgetHostElement): void {
    widget.addEventListener("dragstart", (event: DragEvent) => {
      if (!event.dataTransfer) return;
      event.dataTransfer.setData("text/plain", widget.getAttribute("data-widget-id") || "");
      event.dataTransfer.effectAllowed = "move";
      widget.style.opacity = "0.5";
    });

    widget.addEventListener("dragend", () => {
      widget.style.opacity = "1";
    });

    widget.addEventListener("dragover", (event: DragEvent) => {
      event.preventDefault();
      if (!event.dataTransfer) return;
      event.dataTransfer.dropEffect = "move";
      widget.classList.add("drag-over");
    });

    widget.addEventListener("dragleave", () => {
      widget.classList.remove("drag-over");
    });

    widget.addEventListener("drop", (event: DragEvent) => {
      event.preventDefault();
      widget.classList.remove("drag-over");
      if (!event.dataTransfer || !this.shadowRoot) return;

      const draggedId = event.dataTransfer.getData("text/plain");
      const draggedEl = this.shadowRoot.querySelector(`[data-widget-id="${draggedId}"]`);
      if (!draggedEl) return;
      if (draggedEl === widget) return;

      const main = this.shadowRoot.querySelector("main");
      if (!main) return;
      const all = Array.from(main.children);
      const draggedIndex = all.indexOf(draggedEl);
      const targetIndex = all.indexOf(widget);

      if (draggedIndex < targetIndex) {
        widget.after(draggedEl);
      } else {
        widget.before(draggedEl);
      }
    });
  }

  render() {
    const widgets = this.getWidgetsList();
    const pendingWidgetLabel = this.pendingWidgetType
      ? this.pendingWidgetType.charAt(0).toUpperCase() + this.pendingWidgetType.slice(1)
      : "";
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
          <h2>Add ${pendingWidgetLabel}</h2>
          
          <div class="dialog-group">
            <label for="widget-select">Position Reference:</label>
            <select id="widget-select" value=${this.selectedWidgetId || ""} @change=${(e: Event) => this.selectedWidgetId = (e.target as HTMLSelectElement).value || null}>
              <option value="">At the end (default)</option>
              ${widgetOptions.map(w => html`<option value="${w.id}">${w.id} (${w.type})</option>`)}
            </select>
          </div>

          <div class="dialog-group">
            <label for="position-select">Insert Position:</label>
            <select id="position-select" @change=${(e: Event) => this.insertPosition = (e.target as HTMLSelectElement).value}>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div class="dialog-group">
            <label for="size-select">Widget Size:</label>
            <select id="size-select" @change=${(e: Event) => this.selectedSize = (e.target as HTMLSelectElement).value}>
              <option value="normal">Normal</option>
              <option value="full-row">Full Row</option>
              <option value="full-column">Full Column</option>
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
