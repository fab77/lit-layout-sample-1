import { LitElement, html, css } from 'lit';
import { widgetsProxy } from './WidgetsProxy.js';

export class ImageWC extends LitElement {
  static styles = css`
    :host {
      border: 1px solid yellow;
      display: block;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  `;

  static properties = {
    widgetId: { type: String },
    src: { type: String },
    alt: { type: String },
    linkedFrom: { type: Object }, // Set
  };

  widgetId!: string;
  src!: string;
  alt!: string;
  linkedFrom: Set<string> = new Set();
  _proxyHandler = (event: { eventType?: string; sourceId?: string }) => this.handleProxyEvent(event);

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

  handleProxyEvent(event: { eventType?: string; sourceId?: string }): void {
    if (event.eventType === 'link' && event.sourceId) {
      this.linkedFrom.add(event.sourceId);
      this.requestUpdate();
    }
  }

  render() {
    return html`
      <p>This is ImageWC (${this.widgetId})</p>
      <img src="${this.src}" alt="${this.alt}" />
      <p>Linked from: ${Array.from(this.linkedFrom).join(', ')}</p>
    `;
  }
}

customElements.define('image-wc', ImageWC);
