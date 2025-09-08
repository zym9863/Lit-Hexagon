import { LitElement, html, css } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { createHexagon, getWorldVertices } from '../physics/hex.js';
import { createPhysicsWorld, PhysicsSimulator } from '../physics/engine.js';
import type { PhysicsConfig } from '../physics/engine.js';

/**
 * 六边形弹球游戏组件
 */
@customElement('hex-bounce-game')
export class HexBounceGame extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    
    .controls {
      position: absolute;
      top: 10px;
      left: 10px;
      display: flex;
      gap: 10px;
      z-index: 10;
    }
    
    button {
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.9);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s;
    }
    
    button:hover {
      background: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .info {
      position: absolute;
      bottom: 10px;
      left: 10px;
      color: white;
      font-size: 12px;
      font-family: monospace;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }
  `;
  
  @query('canvas')
  private canvas!: HTMLCanvasElement;
  
  private ctx!: CanvasRenderingContext2D;
  private physics!: PhysicsSimulator;
  private animationId: number = 0;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private resizeObserver?: ResizeObserver;
  
  // 组件属性
  @property({ type: Number }) gravity = 1400;
  @property({ type: Number }) frictionGamma = 0.8;
  @property({ type: Number }) restitution = 0.9;
  @property({ type: Number }) tangentDamping = 0.98;
  @property({ type: Number }) rotationSpeed = 0.6;
  @property({ type: Number }) ballRadiusRatio = 0.07;
  
  @state() private fps = 0;
  @state() private ballSpeed = 0;
  
  private trail: Array<{x: number, y: number, alpha: number}> = [];
  private collisionFlash = 0;
  
  /**
   * 组件首次更新时初始化
   */
  firstUpdated() {
    this.initCanvas();
    this.initPhysics();
    this.setupResizeObserver();
    this.setupVisibilityListener();
    this.start();
  }
  
  /**
   * 初始化Canvas
   */
  private initCanvas() {
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
  }
  
  /**
   * 调整Canvas尺寸
   */
  private resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // 设置实际像素尺寸
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    // 缩放上下文以适应高DPI
    this.ctx.scale(dpr, dpr);
    
    // 重新初始化物理世界以适应新尺寸
    if (this.physics) {
      this.initPhysics();
    }
  }
  
  /**
   * 初始化物理引擎
   */
  private initPhysics() {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const apothem = Math.min(rect.width, rect.height) * 0.35;
    
    const hexagon = createHexagon(centerX, centerY, apothem, this.rotationSpeed);
    
    const config: PhysicsConfig = {
      gravity: this.gravity,
      frictionGamma: this.frictionGamma,
      restitution: this.restitution,
      tangentDamping: this.tangentDamping,
      ballRadius: apothem * this.ballRadiusRatio,
      maxSpeed: 2000
    };
    
    const world = createPhysicsWorld(hexagon, config);
    this.physics = new PhysicsSimulator(world);
  }
  
  /**
   * 设置尺寸变化监听
   */
  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });
    this.resizeObserver.observe(this);
  }
  
  /**
   * 设置页面可见性监听
   */
  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else if (this.isRunning) {
        this.resume();
      }
    });
  }
  
  /**
   * 开始动画循环
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animateFrame();
  }
  
  /**
   * 停止动画
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
  
  /**
   * 暂停动画
   */
  pause() {
    this.stop();
  }
  
  /**
   * 恢复动画
   */
  resume() {
    if (!this.isRunning) {
      this.start();
    }
  }
  
  /**
   * 重置游戏
   */
  reset() {
    this.physics.resetBall();
    this.trail = [];
    this.collisionFlash = 0;
  }
  
  /**
   * 动画循环
   */
  private animateFrame() {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // 计算FPS
    this.fps = Math.round(1 / deltaTime);
    
    // 更新物理
    const prevPos = {...this.physics.getWorld().ball.position};
    this.physics.update(deltaTime);
    const currentPos = this.physics.getWorld().ball.position;
    
    // 检测碰撞（位置突变）
    const dist = Math.hypot(currentPos.x - prevPos.x, currentPos.y - prevPos.y);
    if (dist > 50) {
      this.collisionFlash = 1;
    }
    
    // 更新轨迹
    this.updateTrail(currentPos);
    
    // 计算球速
    const vel = this.physics.getWorld().ball.velocity;
    this.ballSpeed = Math.round(Math.hypot(vel.x, vel.y));
    
    // 渲染
    this.render2D();
    
    // 衰减碰撞闪光
    this.collisionFlash *= 0.9;
    
    this.animationId = requestAnimationFrame(() => this.animateFrame());
  }
  
  /**
   * 更新轨迹
   */
  private updateTrail(pos: {x: number, y: number}) {
    // 添加新位置
    this.trail.push({
      x: pos.x,
      y: pos.y,
      alpha: 0.5
    });
    
    // 更新和清理轨迹
    this.trail = this.trail
      .map(point => ({...point, alpha: point.alpha * 0.95}))
      .filter(point => point.alpha > 0.01)
      .slice(-30); // 最多保留30个点
  }
  
  /**
   * 渲染画面
   */
  private render2D() {
    const rect = this.canvas.getBoundingClientRect();
    const world = this.physics.getWorld();
    
    // 清空画布
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    
    // 绘制六边形
    this.drawHexagon(world.hexagon);
    
    // 绘制轨迹
    this.drawTrail();
    
    // 绘制球
    this.drawBall(world.ball.position, world.config.ballRadius);
  }
  
  /**
   * 绘制六边形
   */
  private drawHexagon(hex: any) {
    const vertices = getWorldVertices(hex);
    
    this.ctx.save();
    
    // 绘制填充
    this.ctx.beginPath();
    this.ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      this.ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    this.ctx.closePath();
    
    // 渐变填充
    const gradient = this.ctx.createRadialGradient(
      hex.center.x, hex.center.y, 0,
      hex.center.x, hex.center.y, hex.apothem
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    // 绘制边框
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // 绘制发光效果
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.restore();
  }
  
  /**
   * 绘制轨迹
   */
  private drawTrail() {
    if (this.trail.length < 2) return;
    
    this.ctx.save();
    
    for (let i = 1; i < this.trail.length; i++) {
      const prev = this.trail[i - 1];
      const curr = this.trail[i];
      
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(curr.x, curr.y);
      
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${curr.alpha * 0.3})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }
  
  /**
   * 绘制球
   */
  private drawBall(pos: {x: number, y: number}, radius: number) {
    this.ctx.save();
    
    // 绘制阴影
    this.ctx.beginPath();
    this.ctx.arc(pos.x + 2, pos.y + 2, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fill();
    
    // 绘制球体
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    
    // 渐变填充
    const gradient = this.ctx.createRadialGradient(
      pos.x - radius * 0.3,
      pos.y - radius * 0.3,
      0,
      pos.x,
      pos.y,
      radius
    );
    gradient.addColorStop(0, '#ffeb3b');
    gradient.addColorStop(0.7, '#ff9800');
    gradient.addColorStop(1, '#f44336');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    // 碰撞闪光效果
    if (this.collisionFlash > 0.1) {
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${this.collisionFlash})`;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = `rgba(255, 255, 255, ${this.collisionFlash})`;
      this.ctx.stroke();
    }
    
    // 高光
    this.ctx.beginPath();
    this.ctx.arc(
      pos.x - radius * 0.3,
      pos.y - radius * 0.3,
      radius * 0.3,
      0,
      Math.PI * 2
    );
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  /**
   * 渲染模板
   */
  render() {
    return html`
      <canvas></canvas>
      <div class="controls">
        <button @click=${this.reset}>重置</button>
        <button @click=${() => this.isRunning ? this.pause() : this.resume()}>
          ${this.isRunning ? '暂停' : '继续'}
        </button>
      </div>
      <div class="info">
        FPS: ${this.fps} | 速度: ${this.ballSpeed} px/s
      </div>
    `;
  }
  
  /**
   * 组件断开时清理
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
    this.resizeObserver?.disconnect();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'hex-bounce-game': HexBounceGame;
  }
}
