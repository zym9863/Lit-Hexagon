import { LitElement, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import './components/hex-bounce-game.js'

/**
 * 主应用元素
 */
@customElement('my-element')
export class MyElement extends LitElement {
  render() {
    return html`
      <div class="container">
        <h1>旋转六边形弹球</h1>
        <div class="game-container">
          <hex-bounce-game></hex-bounce-game>
        </div>
      </div>
    `
  }

  static styles = css`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }

    .container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    }

    h1 {
      margin: 0;
      padding: 20px;
      color: white;
      text-align: center;
      font-size: 2em;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }

    .game-container {
      flex: 1;
      position: relative;
      width: 100%;
      overflow: hidden;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'my-element': MyElement
  }
}
