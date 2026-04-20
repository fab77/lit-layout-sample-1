import { LitElement, css, html, svg } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { widgetsProxy } from "./WidgetsProxy.js";

type WidgetType = "table" | "map" | "image";
type WidgetSize = "normal" | "full-row" | "full-column";
type RackView = "front" | "back";

type WidgetConfig = {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  src?: string;
  alt?: string;
};

type RearPanelLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type WidgetOption = {
  id: string;
  type: WidgetType;
};

const DEFAULT_IMAGE_SRC = "https://via.placeholder.com/300";

export class MyElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      border: 2px solid #111827;
      background:
        radial-gradient(circle at top left, rgba(255, 255, 255, 0.4), transparent 36%),
        linear-gradient(180deg, #d8dfe5 0%, #c6d0d8 100%);
      color: #111827;
    }

    .header {
      background:
        linear-gradient(180deg, rgba(24, 35, 47, 0.98), rgba(12, 20, 29, 0.98)),
        #1f2937;
      color: white;
      padding: 18px 20px;
      flex: 0 0 auto;
      position: sticky;
      top: 0;
      z-index: 20;
      box-shadow: 0 16px 28px rgba(15, 23, 42, 0.24);
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .title-block h1 {
      margin: 0;
      font-size: 1.2rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .title-block p {
      margin: 6px 0 0;
      color: rgba(226, 232, 240, 0.78);
      font-size: 0.92rem;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }

    button {
      padding: 10px 16px;
      background: linear-gradient(180deg, #2b7fff, #0d5bd7);
      color: white;
      border: none;
      border-radius: 999px;
      cursor: pointer;
      font-weight: 600;
      letter-spacing: 0.01em;
      transition:
        transform 140ms ease,
        box-shadow 140ms ease,
        filter 140ms ease;
      box-shadow: 0 10px 24px rgba(13, 91, 215, 0.28);
    }

    button:hover {
      transform: translateY(-1px);
      filter: brightness(1.04);
    }

    button.secondary {
      background: rgba(148, 163, 184, 0.18);
      box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.35);
    }

    button.secondary[data-active="true"] {
      background: linear-gradient(180deg, #f59e0b, #d97706);
      box-shadow: 0 10px 24px rgba(217, 119, 6, 0.28);
    }

    .shortcut-hint {
      font-size: 0.85rem;
      color: rgba(226, 232, 240, 0.78);
    }

    .rack-stage {
      position: relative;
      flex: 1 1 auto;
      min-height: 0;
      outline: none;
    }

    .rack-stage:focus-visible {
      box-shadow: inset 0 0 0 3px rgba(14, 165, 233, 0.45);
    }

    .main {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      overflow: auto;
      padding: 22px;
      min-height: 100%;
      box-sizing: border-box;
      align-items: stretch;
      background:
        linear-gradient(180deg, rgba(248, 250, 252, 0.36), rgba(226, 232, 240, 0.1)),
        repeating-linear-gradient(
          90deg,
          rgba(15, 23, 42, 0.03) 0,
          rgba(15, 23, 42, 0.03) 1px,
          transparent 1px,
          transparent 56px
        ),
        linear-gradient(180deg, #e8eef3 0%, #d7e0e7 100%);
    }

    .widget-shell {
      flex: 0 0 auto;
      width: calc(33.333% - 16px);
      min-width: 250px;
      min-height: 200px;
      box-sizing: border-box;
      position: relative;
      resize: both;
      overflow: auto;
      border-radius: 16px;
      border: 1px solid rgba(15, 23, 42, 0.16);
      background: rgba(255, 255, 255, 0.9);
      box-shadow:
        0 14px 28px rgba(15, 23, 42, 0.09),
        inset 0 1px 0 rgba(255, 255, 255, 0.85);
      transition:
        transform 160ms ease,
        opacity 180ms ease,
        box-shadow 180ms ease;
    }

    .widget-shell::before {
      content: attr(data-widget-id);
      position: absolute;
      top: 10px;
      right: 10px;
      background: linear-gradient(180deg, #ef4444, #dc2626);
      color: white;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      z-index: 2;
      letter-spacing: 0.03em;
      box-shadow: 0 8px 16px rgba(220, 38, 38, 0.24);
    }

    .widget-shell[data-widget-size="full-row"] {
      flex: 0 0 calc(100% - 16px);
      width: calc(100% - 16px);
      min-width: 100%;
    }

    .widget-shell[data-widget-size="full-column"] {
      min-height: calc(100% - 44px);
      width: auto;
      flex: 0 0 auto;
    }

    .widget-shell > * {
      display: block;
      width: 100%;
      min-height: 100%;
      box-sizing: border-box;
      border-radius: 16px;
    }

    .widget-shell.drag-over {
      outline: 3px dashed #0f8ff0;
      outline-offset: -5px;
    }

    .back-mode .widget-shell {
      opacity: 0;
      pointer-events: none;
      user-select: none;
    }

    .rear-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 220ms ease;
      z-index: 5;
    }

    .back-mode .rear-overlay {
      opacity: 1;
    }

    .rear-cables {
      position: absolute;
      inset: 0;
      overflow: visible;
      z-index: 2;
    }

    .rear-panel {
      position: absolute;
      z-index: 1;
      border-radius: 16px;
      box-sizing: border-box;
      padding: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: white;
      overflow: hidden;
      border: 2px solid rgba(255, 255, 255, 0.26);
      box-shadow:
        0 24px 40px rgba(15, 23, 42, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.16);
      background-image:
        linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent),
        radial-gradient(circle at top left, rgba(255, 255, 255, 0.18), transparent 40%);
    }

    .rear-panel::before {
      content: "";
      position: absolute;
      inset: 12px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .rear-panel-body {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      justify-content: center;
    }

    .rear-type {
      font-size: 0.76rem;
      opacity: 0.8;
    }

    .rear-name {
      font-size: 1.1rem;
      font-weight: 700;
    }

    .rear-meta {
      font-size: 0.78rem;
      opacity: 0.9;
    }

    .rear-port {
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #0f172a;
      border: 2px solid rgba(255, 255, 255, 0.82);
      box-shadow:
        0 0 0 4px rgba(255, 255, 255, 0.1),
        0 6px 16px rgba(15, 23, 42, 0.28);
    }

    .rear-port.input {
      transform: translate(-50%, -50%);
    }

    .rear-port.output {
      transform: translate(50%, -50%);
    }

    .rear-port-label {
      position: absolute;
      font-size: 0.68rem;
      font-weight: 700;
      color: rgba(248, 250, 252, 0.86);
      white-space: nowrap;
      transform: translateY(-50%);
      text-shadow: 0 2px 6px rgba(15, 23, 42, 0.45);
    }

    .rear-port-label.input {
      right: calc(100% + 14px);
    }

    .rear-port-label.output {
      left: calc(100% + 14px);
    }

    dialog {
      padding: 20px;
      border: 2px solid #1f2937;
      border-radius: 18px;
      box-shadow: 0 20px 32px rgba(15, 23, 42, 0.24);
      min-width: min(440px, calc(100vw - 32px));
    }

    dialog::backdrop {
      background-color: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(6px);
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .dialog-content h2 {
      margin: 0;
      color: #111827;
    }

    .dialog-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .dialog-group label {
      font-weight: 700;
      color: #1f2937;
    }

    .dialog-group select {
      padding: 10px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 14px;
      background: #fff;
    }

    .dialog-buttons {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 8px;
    }

    @media (max-width: 900px) {
      .widget-shell {
        width: calc(50% - 16px);
      }
    }

    @media (max-width: 640px) {
      .main {
        padding: 16px;
      }

      .widget-shell,
      .widget-shell[data-widget-size="full-row"] {
        width: 100%;
        min-width: 100%;
        flex-basis: 100%;
      }

      .header-row {
        flex-direction: column;
      }
    }
  `;

  static properties = {
    widgetCount: { type: Number },
    showDialog: { type: Boolean },
    selectedWidgetId: { type: String },
    insertPosition: { type: String },
    pendingWidgetType: { type: String },
    selectedSize: { type: String },
    rackView: { type: String },
    widgets: { type: Array },
    rearLayouts: { type: Object },
  };

  widgetCount = 0;
  showDialog = false;
  selectedWidgetId: string | null = null;
  insertPosition = "left";
  pendingWidgetType: WidgetType | null = null;
  selectedSize: WidgetSize = "normal";
  rackView: RackView = "front";
  widgets: WidgetConfig[] = [];
  rearLayouts: Record<string, RearPanelLayout> = {};

  private resizeObserver?: ResizeObserver;
  private resizeFrame?: number;
  private graphListener = () => {
    this.requestUpdate();
  };

  connectedCallback(): void {
    super.connectedCallback();
    widgetsProxy.onGraphChange(this.graphListener);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    widgetsProxy.offGraphChange(this.graphListener);
    this.resizeObserver?.disconnect();
    if (this.resizeFrame) {
      cancelAnimationFrame(this.resizeFrame);
    }
  }

  firstUpdated(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleRearLayoutMeasurement();
    });
    this.syncResizeObserverTargets();
    this.scheduleRearLayoutMeasurement();
  }

  updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has("widgets") || changedProperties.has("rackView")) {
      this.syncResizeObserverTargets();
      this.scheduleRearLayoutMeasurement();
    }
  }

  openDialog(type: WidgetType): void {
    this.pendingWidgetType = type;
    this.showDialog = true;
    this.selectedWidgetId = null;
    this.insertPosition = "left";
    this.selectedSize = "normal";
    this.requestUpdate();
    setTimeout(() => {
      const dialog = this.shadowRoot?.querySelector("dialog") as HTMLDialogElement | null;
      if (!dialog) return;
      dialog.showModal();
      const widgetSelect = dialog.querySelector("#widget-select") as HTMLSelectElement | null;
      const positionSelect = dialog.querySelector("#position-select") as HTMLSelectElement | null;
      const sizeSelect = dialog.querySelector("#size-select") as HTMLSelectElement | null;
      if (widgetSelect) widgetSelect.value = "";
      if (positionSelect) positionSelect.value = "left";
      if (sizeSelect) sizeSelect.value = "normal";
    }, 0);
  }

  closeDialog(): void {
    this.showDialog = false;
    (this.shadowRoot?.querySelector("dialog") as HTMLDialogElement | null)?.close();
  }

  confirmAddWidget(): void {
    if (!this.pendingWidgetType) return;

    const id = `widget-${++this.widgetCount}`;
    const widget: WidgetConfig = {
      id,
      type: this.pendingWidgetType,
      size: this.selectedSize || "normal",
    };

    if (widget.type === "image") {
      widget.src = DEFAULT_IMAGE_SRC;
      widget.alt = "Dynamic Image";
    }

    const nextWidgets = [...this.widgets];
    const referenceIndex = this.selectedWidgetId
      ? nextWidgets.findIndex(item => item.id === this.selectedWidgetId)
      : -1;

    if (referenceIndex === -1) {
      nextWidgets.push(widget);
    } else {
      const insertIndex = this.insertPosition === "left" ? referenceIndex : referenceIndex + 1;
      nextWidgets.splice(insertIndex, 0, widget);
    }

    this.widgets = nextWidgets;
    this.closeDialog();
  }

  addTable = (): void => {
    this.openDialog("table");
  };

  addMap = (): void => {
    this.openDialog("map");
  };

  addImage = (): void => {
    this.openDialog("image");
  };

  toggleRackView(): void {
    this.rackView = this.rackView === "front" ? "back" : "front";
  }

  handleRackKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isRackSurface = target?.classList.contains("rack-stage");
    if (event.key === "Tab" && isRackSurface) {
      event.preventDefault();
      this.toggleRackView();
    }
  }

  handleDragStart(widgetId: string, event: DragEvent): void {
    if (this.rackView !== "front" || !event.dataTransfer) return;
    event.dataTransfer.setData("text/plain", widgetId);
    event.dataTransfer.effectAllowed = "move";
    const shell = event.currentTarget as HTMLElement | null;
    if (shell) {
      shell.style.opacity = "0.55";
    }
  }

  handleDragEnd(event: DragEvent): void {
    const shell = event.currentTarget as HTMLElement | null;
    if (shell) {
      shell.style.opacity = "";
      shell.classList.remove("drag-over");
    }
  }

  handleDragOver(event: DragEvent): void {
    if (this.rackView !== "front") return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    const shell = event.currentTarget as HTMLElement | null;
    shell?.classList.add("drag-over");
  }

  handleDragLeave(event: DragEvent): void {
    const shell = event.currentTarget as HTMLElement | null;
    shell?.classList.remove("drag-over");
  }

  handleDrop(targetId: string, event: DragEvent): void {
    if (this.rackView !== "front" || !event.dataTransfer) return;
    event.preventDefault();
    const shell = event.currentTarget as HTMLElement | null;
    shell?.classList.remove("drag-over");

    const draggedId = event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) return;

    const nextWidgets = [...this.widgets];
    const draggedIndex = nextWidgets.findIndex(widget => widget.id === draggedId);
    const targetIndex = nextWidgets.findIndex(widget => widget.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedWidget] = nextWidgets.splice(draggedIndex, 1);
    const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    nextWidgets.splice(adjustedTargetIndex, 0, draggedWidget);
    this.widgets = nextWidgets;
  }

  private syncResizeObserverTargets(): void {
    if (!this.resizeObserver) return;
    this.resizeObserver.disconnect();

    const main = this.shadowRoot?.querySelector(".main") as HTMLElement | null;
    if (main) {
      this.resizeObserver.observe(main);
    }

    for (const shell of this.getWidgetShells()) {
      this.resizeObserver.observe(shell);
    }
  }

  private scheduleRearLayoutMeasurement(): void {
    if (this.resizeFrame) {
      cancelAnimationFrame(this.resizeFrame);
    }
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = undefined;
      this.measureRearLayouts();
    });
  }

  private measureRearLayouts(): void {
    const main = this.shadowRoot?.querySelector(".main") as HTMLElement | null;
    if (!main) return;

    const mainRect = main.getBoundingClientRect();
    const nextLayouts: Record<string, RearPanelLayout> = {};

    for (const shell of this.getWidgetShells()) {
      const widgetId = shell.dataset.widgetId;
      if (!widgetId) continue;
      const rect = shell.getBoundingClientRect();
      nextLayouts[widgetId] = {
        left: rect.left - mainRect.left + main.scrollLeft,
        top: rect.top - mainRect.top + main.scrollTop,
        width: rect.width,
        height: rect.height,
      };
    }

    this.rearLayouts = nextLayouts;
  }

  private getWidgetShells(): HTMLElement[] {
    return Array.from(this.shadowRoot?.querySelectorAll<HTMLElement>(".widget-shell") ?? []);
  }

  private getWidgetOptions(): WidgetOption[] {
    return this.widgets.map(widget => ({ id: widget.id, type: widget.type }));
  }

  private getWidgetTone(type: WidgetType): string {
    if (type === "table") {
      return "linear-gradient(140deg, #ef4444, #b91c1c)";
    }
    if (type === "map") {
      return "linear-gradient(140deg, #10b981, #047857)";
    }
    return "linear-gradient(140deg, #f59e0b, #d97706)";
  }

  private getCableColor(type: WidgetType): string {
    if (type === "table") {
      return "#f87171";
    }
    if (type === "map") {
      return "#34d399";
    }
    return "#fbbf24";
  }

  private renderWidget(widget: WidgetConfig) {
    if (widget.type === "table") {
      return html`<table-wc .widgetId=${widget.id}></table-wc>`;
    }
    if (widget.type === "map") {
      return html`<map-wc .widgetId=${widget.id}></map-wc>`;
    }
    return html`
      <image-wc
        .widgetId=${widget.id}
        .src=${widget.src ?? DEFAULT_IMAGE_SRC}
        .alt=${widget.alt ?? "Dynamic Image"}
      ></image-wc>
    `;
  }

  private renderRearPanel(widget: WidgetConfig) {
    const layout = this.rearLayouts[widget.id];
    if (!layout) return null;

    const incoming = widgetsProxy
      .getLinkedSources(widget.id)
      .slice()
      .sort((left, right) => left.localeCompare(right));
    const outgoing = widgetsProxy
      .getLinkedTargets(widget.id)
      .slice()
      .sort((left, right) => left.localeCompare(right));

    return html`
      <div
        class="rear-panel"
        style=${[
          `left:${layout.left}px`,
          `top:${layout.top}px`,
          `width:${layout.width}px`,
          `height:${layout.height}px`,
          `background:${this.getWidgetTone(widget.type)}`,
        ].join(";")}
      >
        <div class="rear-panel-body">
          <span class="rear-type">${widget.type} module</span>
          <span class="rear-name">${widget.id}</span>
          <span class="rear-meta">${incoming.length} in / ${outgoing.length} out</span>
        </div>
        ${incoming.map((sourceId, index) => {
          const top = ((index + 1) / (incoming.length + 1)) * 100;
          return html`
            <span class="rear-port input" style=${`left:0;top:${top}%`}></span>
            <span class="rear-port-label input" style=${`left:18px;top:${top}%`}>${sourceId}</span>
          `;
        })}
        ${outgoing.map((targetId, index) => {
          const top = ((index + 1) / (outgoing.length + 1)) * 100;
          return html`
            <span class="rear-port output" style=${`right:0;top:${top}%`}></span>
            <span class="rear-port-label output" style=${`right:18px;top:${top}%`}>${targetId}</span>
          `;
        })}
      </div>
    `;
  }

  private renderRearCables() {
    const links = widgetsProxy.getAllLinks();

    return svg`
      <svg class="rear-cables" aria-hidden="true">
        ${links.map(({ sourceId, targetId }) => {
          const sourceWidget = this.widgets.find(widget => widget.id === sourceId);
          const sourceLayout = this.rearLayouts[sourceId];
          const targetLayout = this.rearLayouts[targetId];
          if (!sourceWidget || !sourceLayout || !targetLayout) {
            return null;
          }

          const outgoing = widgetsProxy
            .getLinkedTargets(sourceId)
            .slice()
            .sort((left, right) => left.localeCompare(right));
          const incoming = widgetsProxy
            .getLinkedSources(targetId)
            .slice()
            .sort((left, right) => left.localeCompare(right));
          const outgoingIndex = Math.max(0, outgoing.indexOf(targetId));
          const incomingIndex = Math.max(0, incoming.indexOf(sourceId));

          const startX = sourceLayout.left + sourceLayout.width;
          const startY = sourceLayout.top + (sourceLayout.height * (outgoingIndex + 1)) / (outgoing.length + 1);
          const endX = targetLayout.left;
          const endY = targetLayout.top + (targetLayout.height * (incomingIndex + 1)) / (incoming.length + 1);
          const curveX = Math.max(56, Math.abs(endX - startX) * 0.4);
          const color = this.getCableColor(sourceWidget.type);

          return svg`
            <g>
              <path
                d=${`M ${startX} ${startY} C ${startX + curveX} ${startY}, ${endX - curveX} ${endY}, ${endX} ${endY}`}
                fill="none"
                stroke="rgba(15, 23, 42, 0.22)"
                stroke-width="10"
                stroke-linecap="round"
              ></path>
              <path
                d=${`M ${startX} ${startY} C ${startX + curveX} ${startY}, ${endX - curveX} ${endY}, ${endX} ${endY}`}
                fill="none"
                stroke=${color}
                stroke-width="5"
                stroke-linecap="round"
              ></path>
            </g>
          `;
        })}
      </svg>
    `;
  }

  render() {
    const pendingWidgetLabel = this.pendingWidgetType
      ? this.pendingWidgetType.charAt(0).toUpperCase() + this.pendingWidgetType.slice(1)
      : "";
    const widgetOptions = this.getWidgetOptions();
    const backViewActive = this.rackView === "back";

    return html`
      <header class="header">
        <div class="header-row">
          <div class="title-block">
            <h1>Rack Playground</h1>
            <p>Front for content, back for ports and live cable routes between linked widgets.</p>
          </div>
          <div class="controls">
            <button @click=${this.addTable}>Add Table</button>
            <button @click=${this.addMap}>Add Map</button>
            <button @click=${this.addImage}>Add Image</button>
            <button
              class="secondary"
              data-active=${backViewActive ? "true" : "false"}
              @click=${() => this.toggleRackView()}
            >
              ${backViewActive ? "Switch To Front" : "Switch To Back"}
            </button>
            <span class="shortcut-hint">Focus the rack surface and press Tab to flip it.</span>
          </div>
        </div>
      </header>

      <section class="rack-stage" tabindex="0" @keydown=${this.handleRackKeydown}>
        <main class="main ${backViewActive ? "back-mode" : ""}">
          ${repeat(
            this.widgets,
            widget => widget.id,
            widget => html`
              <div
                class="widget-shell"
                data-widget-id=${widget.id}
                data-widget-type=${widget.type}
                data-widget-size=${widget.size}
                .draggable=${this.rackView === "front"}
                @dragstart=${(event: DragEvent) => this.handleDragStart(widget.id, event)}
                @dragend=${this.handleDragEnd}
                @dragover=${this.handleDragOver}
                @dragleave=${this.handleDragLeave}
                @drop=${(event: DragEvent) => this.handleDrop(widget.id, event)}
              >
                ${this.renderWidget(widget)}
              </div>
            `,
          )}

          <div class="rear-overlay" ?hidden=${!backViewActive}>
            ${this.widgets.map(widget => this.renderRearPanel(widget))}
            ${this.renderRearCables()}
          </div>
        </main>
      </section>

      <dialog>
        <div class="dialog-content">
          <h2>Add ${pendingWidgetLabel}</h2>

          <div class="dialog-group">
            <label for="widget-select">Position Reference:</label>
            <select
              id="widget-select"
              .value=${this.selectedWidgetId ?? ""}
              @change=${(event: Event) => {
                this.selectedWidgetId = (event.target as HTMLSelectElement).value || null;
              }}
            >
              <option value="">At the end (default)</option>
              ${widgetOptions.map(
                widget => html`<option value=${widget.id}>${widget.id} (${widget.type})</option>`,
              )}
            </select>
          </div>

          <div class="dialog-group">
            <label for="position-select">Insert Position:</label>
            <select
              id="position-select"
              .value=${this.insertPosition}
              @change=${(event: Event) => {
                this.insertPosition = (event.target as HTMLSelectElement).value;
              }}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div class="dialog-group">
            <label for="size-select">Widget Size:</label>
            <select
              id="size-select"
              .value=${this.selectedSize}
              @change=${(event: Event) => {
                this.selectedSize = (event.target as HTMLSelectElement).value as WidgetSize;
              }}
            >
              <option value="normal">Normal</option>
              <option value="full-row">Full Row</option>
              <option value="full-column">Full Column</option>
            </select>
          </div>

          <div class="dialog-buttons">
            <button class="secondary" @click=${() => this.closeDialog()}>Cancel</button>
            <button @click=${() => this.confirmAddWidget()}>Add</button>
          </div>
        </div>
      </dialog>
    `;
  }
}

customElements.define("my-element", MyElement);
