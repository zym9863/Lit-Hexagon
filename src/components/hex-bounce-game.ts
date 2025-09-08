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
      background: 
        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%),
        linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      animation: backgroundShift 20s ease-in-out infinite;
    }
    
    @keyframes backgroundShift {
      0%, 100% { 
        filter: hue-rotate(0deg) brightness(1); 
      }
      25% { 
        filter: hue-rotate(5deg) brightness(1.05); 
      }
      50% { 
        filter: hue-rotate(10deg) brightness(1.1); 
      }
      75% { 
        filter: hue-rotate(5deg) brightness(1.05); 
      }
    }
    
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    
    .controls {
      position: absolute;
      top: 20px;
      left: 20px;
      display: flex;
      gap: 15px;
      z-index: 10;
    }
    
    button {
      padding: 12px 24px;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
      border: none;
      border-radius: 12px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
      box-shadow: 
        0 4px 15px rgba(0, 0, 0, 0.1),
        0 1px 3px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      position: relative;
      overflow: hidden;
    }
    
    button::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
      transition: left 0.5s;
    }
    
    button:hover {
      background: linear-gradient(145deg, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0.9));
      transform: translateY(-3px) scale(1.02);
      box-shadow: 
        0 8px 25px rgba(0, 0, 0, 0.15),
        0 2px 10px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }
    
    button:hover::before {
      left: 100%;
    }
    
    button:active {
      transform: translateY(-1px) scale(0.98);
      box-shadow: 
        0 2px 10px rgba(0, 0, 0, 0.15),
        0 1px 3px rgba(0, 0, 0, 0.2);
    }
    
    .info {
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: white;
      font-size: 14px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-weight: 500;
      text-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.8),
        0 0 10px rgba(255, 255, 255, 0.3);
      background: linear-gradient(145deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.1));
      padding: 10px 16px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
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
  
  private trail: Array<{x: number, y: number, alpha: number, timestamp: number}> = [];
  private collisionFlash = 0;
  private particles: Array<{x: number, y: number, vx: number, vy: number, life: number, maxLife: number}> = [];
  
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
    this.particles = [];
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
      this.createCollisionParticles(currentPos);
    }
    
    // 更新轨迹
    this.updateTrail(currentPos);
    
    // 更新粒子
    this.updateParticles(deltaTime);
    
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
    const now = performance.now();
    
    // 添加新位置
    this.trail.push({
      x: pos.x,
      y: pos.y,
      alpha: 0.8,
      timestamp: now
    });
    
    // 更新和清理轨迹
    this.trail = this.trail
      .map(point => ({
        ...point, 
        alpha: Math.max(0, point.alpha * 0.96 - (now - point.timestamp) * 0.001)
      }))
      .filter(point => point.alpha > 0.01)
      .slice(-40); // 最多保留40个点
  }
  
  /**
   * 创建碰撞粒子
   */
  private createCollisionParticles(pos: {x: number, y: number}) {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5
      });
    }
  }
  
  /**
   * 更新粒子
   */
  private updateParticles(deltaTime: number) {
    this.particles = this.particles
      .map(particle => ({
        ...particle,
        x: particle.x + particle.vx * deltaTime,
        y: particle.y + particle.vy * deltaTime,
        vx: particle.vx * 0.98,
        vy: particle.vy * 0.98,
        life: particle.life - deltaTime / particle.maxLife
      }))
      .filter(particle => particle.life > 0);
  }
  
  /**
   * 绘制粒子
   */
  private drawParticles() {
    this.ctx.save();
    
    this.particles.forEach(particle => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, 2 * particle.life, 0, Math.PI * 2);
      
      const alpha = particle.life * 0.8;
      this.ctx.fillStyle = `rgba(255, 193, 7, ${alpha})`;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = `rgba(255, 193, 7, ${alpha})`;
      this.ctx.fill();
    });
    
    this.ctx.restore();
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
    
    // 绘制粒子
    this.drawParticles();
    
    // 绘制球
    this.drawBall(world.ball.position, world.config.ballRadius);
  }
  
  /**
   * 绘制六边形
   */
  private drawHexagon(hex: any) {
    const vertices = getWorldVertices(hex);
    
    this.ctx.save();
    
    // 绘制外发光
    this.ctx.shadowBlur = 30;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    
    // 绘制填充
    this.ctx.beginPath();
    this.ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      this.ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    this.ctx.closePath();
    
    // 多层渐变填充
    const gradient1 = this.ctx.createRadialGradient(
      hex.center.x, hex.center.y, 0,
      hex.center.x, hex.center.y, hex.apothem * 0.8
    );
    gradient1.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    gradient1.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
    gradient1.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
    this.ctx.fillStyle = gradient1;
    this.ctx.fill();
    
    // 内发光
    const gradient2 = this.ctx.createRadialGradient(
      hex.center.x, hex.center.y, hex.apothem * 0.6,
      hex.center.x, hex.center.y, hex.apothem
    );
    gradient2.addColorStop(0, 'transparent');
    gradient2.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    this.ctx.fillStyle = gradient2;
    this.ctx.fill();
    
    // 绘制主边框
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
    
    // 绘制内边框发光
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // 绘制外边框发光
    this.ctx.shadowBlur = 40;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    // 绘制顶点高光
    vertices.forEach(vertex => {
      this.ctx.beginPath();
      this.ctx.arc(vertex.x, vertex.y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      this.ctx.fill();
    });
    
    this.ctx.restore();
  }
  
  /**
   * 绘制轨迹
   */
  private drawTrail() {
    if (this.trail.length < 2) return;
    
    this.ctx.save();
    
    // 绘制轨迹线条
    for (let i = 1; i < this.trail.length; i++) {
      const prev = this.trail[i - 1];
      const curr = this.trail[i];
      const progress = i / this.trail.length;
      
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(curr.x, curr.y);
      
      // 渐变轨迹颜色
      const gradient = this.ctx.createLinearGradient(prev.x, prev.y, curr.x, curr.y);
      gradient.addColorStop(0, `rgba(255, 193, 7, ${prev.alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(255, 152, 0, ${curr.alpha * 0.8})`);
      
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 3 * progress;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }
    
    // 绘制轨迹发光效果
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = 'rgba(255, 193, 7, 0.4)';
    
    for (let i = 1; i < this.trail.length; i++) {
      const prev = this.trail[i - 1];
      const curr = this.trail[i];
      
      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(curr.x, curr.y);
      
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${curr.alpha * 0.2})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
    
    // 绘制轨迹粒子
    this.trail.forEach((point, index) => {
      if (index % 3 === 0 && point.alpha > 0.3) {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 1.5 * point.alpha, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${point.alpha * 0.8})`;
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = `rgba(255, 193, 7, ${point.alpha})`;
        this.ctx.fill();
      }
    });
    
    this.ctx.restore();
  }
  
  /**
   * 绘制球
   */
  private drawBall(pos: {x: number, y: number}, radius: number) {
    this.ctx.save();
    
    // 绘制阴影
    this.ctx.beginPath();
    this.ctx.arc(pos.x + 3, pos.y + 3, radius * 1.1, 0, Math.PI * 2);
    const shadowGradient = this.ctx.createRadialGradient(
      pos.x + 3, pos.y + 3, 0,
      pos.x + 3, pos.y + 3, radius * 1.1
    );
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = shadowGradient;
    this.ctx.fill();
    
    // 绘制球体基础
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    
    // 主体渐变
    const mainGradient = this.ctx.createRadialGradient(
      pos.x - radius * 0.3,
      pos.y - radius * 0.3,
      0,
      pos.x,
      pos.y,
      radius
    );
    mainGradient.addColorStop(0, '#ffeb3b');
    mainGradient.addColorStop(0.3, '#ffc107');
    mainGradient.addColorStop(0.7, '#ff9800');
    mainGradient.addColorStop(1, '#e65100');
    
    this.ctx.fillStyle = mainGradient;
    this.ctx.fill();
    
    // 内发光
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius * 0.8, 0, Math.PI * 2);
    const innerGlow = this.ctx.createRadialGradient(
      pos.x, pos.y, 0,
      pos.x, pos.y, radius * 0.8
    );
    innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = innerGlow;
    this.ctx.fill();
    
    // 碰撞闪光效果
    if (this.collisionFlash > 0.1) {
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, radius * 1.2, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${this.collisionFlash * 0.8})`;
      this.ctx.lineWidth = 4;
      this.ctx.shadowBlur = 25;
      this.ctx.shadowColor = `rgba(255, 255, 255, ${this.collisionFlash})`;
      this.ctx.stroke();
      
      // 额外的冲击波效果
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, radius * (1.5 + this.collisionFlash * 0.5), 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${this.collisionFlash * 0.3})`;
      this.ctx.lineWidth = 2;
      this.ctx.shadowBlur = 15;
      this.ctx.stroke();
    }
    
    // 主高光
    this.ctx.beginPath();
    this.ctx.arc(
      pos.x - radius * 0.35,
      pos.y - radius * 0.35,
      radius * 0.25,
      0,
      Math.PI * 2
    );
    const highlightGradient = this.ctx.createRadialGradient(
      pos.x - radius * 0.35, pos.y - radius * 0.35, 0,
      pos.x - radius * 0.35, pos.y - radius * 0.35, radius * 0.25
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    highlightGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.4)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = highlightGradient;
    this.ctx.fill();
    
    // 次要高光
    this.ctx.beginPath();
    this.ctx.arc(
      pos.x + radius * 0.2,
      pos.y + radius * 0.3,
      radius * 0.1,
      0,
      Math.PI * 2
    );
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.fill();
    
    // 外发光
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = '#ff9800';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 152, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
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
