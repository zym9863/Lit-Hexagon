import type { Vector2 } from './vector2.js';
import { vec2, add, scale, clampLength } from './vector2.js';
import type { HexagonState } from './hex.js';
import { updateRotation } from './hex.js';
import { resolveCollision } from './collision.js';

/**
 * 物理引擎配置参数
 */
export interface PhysicsConfig {
  gravity: number;           // 重力加速度（像素/秒²）
  frictionGamma: number;     // 摩擦系数（每秒）
  restitution: number;       // 恢复系数（0-1）
  tangentDamping: number;    // 切向阻尼系数（0-1）
  ballRadius: number;        // 球半径（像素）
  maxSpeed: number;          // 最大速度（像素/秒）
}

/**
 * 球的物理状态
 */
export interface BallState {
  position: Vector2;         // 位置
  velocity: Vector2;         // 速度
}

/**
 * 物理世界状态
 */
export interface PhysicsWorld {
  ball: BallState;
  hexagon: HexagonState;
  config: PhysicsConfig;
}

/**
 * 创建默认物理配置
 * @param apothem - 六边形内切圆半径
 * @returns 默认物理配置
 */
export function createDefaultConfig(apothem: number): PhysicsConfig {
  return {
    gravity: 1400,                    // 重力
    frictionGamma: 0.8,               // 摩擦系数
    restitution: 0.9,                 // 恢复系数
    tangentDamping: 0.98,             // 切向阻尼
    ballRadius: apothem * 0.07,       // 球半径为内切圆半径的7%
    maxSpeed: 2000                    // 最大速度限制
  };
}

/**
 * 创建物理世界
 * @param hexagon - 六边形状态
 * @param config - 物理配置
 * @returns 物理世界对象
 */
export function createPhysicsWorld(
  hexagon: HexagonState,
  config?: PhysicsConfig
): PhysicsWorld {
  const finalConfig = config || createDefaultConfig(hexagon.apothem);
  
  // 初始化球在中心上方
  const ball: BallState = {
    position: vec2(hexagon.center.x, hexagon.center.y - hexagon.apothem * 0.5),
    velocity: vec2(0, 0)
  };
  
  return {
    ball,
    hexagon,
    config: finalConfig
  };
}

/**
 * 执行一个物理步进
 * @param world - 物理世界
 * @param dt - 时间步长（秒）
 */
export function stepPhysics(world: PhysicsWorld, dt: number): void {
  const { ball, hexagon, config } = world;
  
  // 1. 更新六边形旋转
  updateRotation(hexagon, dt);
  
  // 2. 施加重力
  ball.velocity.y += config.gravity * dt;
  
  // 3. 应用全局摩擦（指数衰减）
  const dampingFactor = Math.exp(-config.frictionGamma * dt);
  ball.velocity = scale(ball.velocity, dampingFactor);
  
  // 4. 限制最大速度
  ball.velocity = clampLength(ball.velocity, config.maxSpeed);
  
  // 5. 预测新位置
  const predictedPos = add(ball.position, scale(ball.velocity, dt));
  
  // 6. 碰撞检测与响应
  const result = resolveCollision(
    predictedPos,
    ball.velocity,
    config.ballRadius,
    hexagon,
    config.restitution,
    config.tangentDamping
  );
  
  // 7. 更新状态
  ball.position = result.position;
  ball.velocity = result.velocity;
}

/**
 * 固定时间步物理模拟器
 */
export class PhysicsSimulator {
  private world: PhysicsWorld;
  private accumulator: number = 0;
  private readonly fixedDeltaTime: number = 1 / 120; // 120Hz物理更新
  private readonly maxDeltaTime: number = 0.1;       // 最大帧时间
  
  constructor(world: PhysicsWorld) {
    this.world = world;
  }
  
  /**
   * 更新物理模拟
   * @param deltaTime - 帧时间（秒）
   */
  update(deltaTime: number): void {
    // 限制最大帧时间，避免螺旋死亡
    const dt = Math.min(deltaTime, this.maxDeltaTime);
    
    this.accumulator += dt;
    
    // 固定时间步更新
    let steps = 0;
    const maxSteps = 5; // 每帧最多5个物理步
    
    while (this.accumulator >= this.fixedDeltaTime && steps < maxSteps) {
      stepPhysics(this.world, this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
      steps++;
    }
    
    // 如果累积时间过多，丢弃多余部分
    if (this.accumulator > this.fixedDeltaTime * 2) {
      this.accumulator = 0;
    }
  }
  
  /**
   * 重置球的状态
   */
  resetBall(): void {
    const { hexagon } = this.world;
    this.world.ball.position = vec2(
      hexagon.center.x,
      hexagon.center.y - hexagon.apothem * 0.5
    );
    this.world.ball.velocity = vec2(0, 0);
    this.accumulator = 0;
  }
  
  /**
   * 获取当前世界状态
   */
  getWorld(): PhysicsWorld {
    return this.world;
  }
  
  /**
   * 更新物理配置
   * @param config - 部分配置更新
   */
  updateConfig(config: Partial<PhysicsConfig>): void {
    Object.assign(this.world.config, config);
  }
}
