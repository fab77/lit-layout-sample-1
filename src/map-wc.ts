import { LitElement, html, css } from 'lit';
import { widgetsProxy } from './WidgetsProxy.js';

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
  `;

  static properties = {
    widgetId: { type: String },
    center: { type: String },
    zoom: { type: Number },
    linkedFrom: { type: Object }, // Set
  };

  widgetId!: string;
  center!: string;
  zoom!: number;
  linkedFrom!: Set<string>;
  _proxyHandler!: (event: any) => void;

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

  handleProxyEvent(event: any): void {
    if (event.eventType === 'link') {
      this.linkedFrom.add(event.sourceId);
      this.requestUpdate();
    }
  }

  render() {
    return html`
      <div class="map">
        <p>This is MapWC (${this.widgetId})</p>
      </div>
      <p>Linked from: ${Array.from(this.linkedFrom).join(', ')}</p>
    `;
  }
}

customElements.define('map-wc', MapWC);