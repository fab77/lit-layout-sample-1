import { LitElement, html, css } from 'lit';

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
    src: { type: String },
    alt: { type: String },
  };

  constructor() {
    super();
    this.src = '';
    this.alt = '';
  }

  render() {
    return html`
      <p>This is ImageWC</p>
      <img src="${this.src}" alt="${this.alt}" />
    `;
  }
}

customElements.define('image-wc', ImageWC);