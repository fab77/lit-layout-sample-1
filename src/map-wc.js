import { LitElement, html, css } from 'lit';

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
    center: { type: String },
    zoom: { type: Number },
  };

  constructor() {
    super();
    this.center = 'World';
    this.zoom = 1;
  }

  render() {
    return html`
      <div class="map">
        <p>This is MapWC</p>
      </div>
    `;
  }
}

customElements.define('map-wc', MapWC);