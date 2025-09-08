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
      background: 
        radial-gradient(ellipse at top, rgba(255, 255, 255, 0.1) 0%, transparent 70%),
        linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    }

    h1 {
      margin: 0;
      padding: 30px 20px 20px;
      color: white;
      text-align: center;
      font-size: 2.5em;
      font-weight: 700;
      text-shadow: 
        0 4px 8px rgba(0, 0, 0, 0.5),
        0 0 20px rgba(255, 255, 255, 0.3);
      letter-spacing: 1px;
      position: relative;
    }
    
    h1::after {
      content: '';
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 3px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
      border-radius: 2px;
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
