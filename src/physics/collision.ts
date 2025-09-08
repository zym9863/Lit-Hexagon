import type { Vector2 } from './vector2.js';
import { vec2, sub, add, scale, dot, perp, copy } from './vector2.js';
import type { HexagonState } from './hex.js';
import { getWorldNormals, getRelativePosition } from './hex.js';

/**
 * 碰撞检测结果
 */
export interface CollisionResult {
  collided: boolean;         // 是否发生碰撞
  penetration: number;        // 穿透深度
  normal: Vector2;           // 碰撞法线
  edgeIndex: number;         // 碰撞边的索引
}

/**
 * 检测球与六边形的碰撞
 * @param ballPos - 球心位置
 * @param ballRadius - 球半径
 * @param hex - 六边形状态
 * @returns 碰撞检测结果
 */
export function detectCollision(
  ballPos: Vector2,
  ballRadius: number,
  hex: HexagonState
): CollisionResult {
  const relPos = getRelativePosition(ballPos, hex);
  const normals = getWorldNormals(hex.theta);
  const threshold = hex.apothem - ballRadius;
  
  let maxPenetration = -Infinity;
  let collisionNormal = vec2();
  let collisionEdge = -1;
  
  // 检查每条边的穿透
  for (let i = 0; i < normals.length; i++) {
    const normal = normals[i];
    const distance = dot(relPos, normal);
    const penetration = distance - threshold;
    
    if (penetration > maxPenetration) {
      maxPenetration = penetration;
      collisionNormal = normal;
      collisionEdge = i;
    }
  }
  
  return {
    collided: maxPenetration > 0,
    penetration: Math.max(0, maxPenetration),
    normal: collisionNormal,
    edgeIndex: collisionEdge
  };
}

/**
 * 计算墙面在接触点的速度
 * @param contactPoint - 接触点相对于六边形中心的位置
 * @param omega - 六边形角速度
 * @returns 墙面速度向量
 */
export function getWallVelocity(contactPoint: Vector2, omega: number): Vector2 {
  // 墙面速度 = ω × r（垂直于半径向量）
  const perpVector = perp(contactPoint);
  return scale(perpVector, omega);
}

/**
 * 计算碰撞响应后的速度
 * @param velocity - 球的当前速度
 * @param normal - 碰撞法线
 * @param wallVelocity - 墙面速度
 * @param restitution - 法向恢复系数
 * @param tangentDamping - 切向阻尼系数
 * @returns 碰撞后的速度
 */
export function computeCollisionResponse(
  velocity: Vector2,
  normal: Vector2,
  wallVelocity: Vector2,
  restitution: number,
  tangentDamping: number
): Vector2 {
  // 计算相对速度
  const relVel = sub(velocity, wallVelocity);
  
  // 分解为法向和切向分量
  const normalSpeed = dot(relVel, normal);
  
  // 如果速度指向墙外（正在离开），不处理
  if (normalSpeed >= 0) {
    return velocity;
  }
  
  // 法向分量：反弹
  const normalComponent = scale(normal, normalSpeed);
  const tangentComponent = sub(relVel, normalComponent);
  
  // 应用恢复系数和阻尼
  const newNormalComponent = scale(normal, -restitution * normalSpeed);
  const newTangentComponent = scale(tangentComponent, tangentDamping);
  
  // 合成新速度（加回墙面速度）
  return add(add(newNormalComponent, newTangentComponent), wallVelocity);
}

/**
 * 处理球与六边形的完整碰撞
 * @param ballPos - 球心位置
 * @param ballVel - 球的速度
 * @param ballRadius - 球半径
 * @param hex - 六边形状态
 * @param restitution - 恢复系数
 * @param tangentDamping - 切向阻尼
 * @param dt - 时间步长
 * @returns 修正后的位置和速度
 */
export function resolveCollision(
  ballPos: Vector2,
  ballVel: Vector2,
  ballRadius: number,
  hex: HexagonState,
  restitution: number,
  tangentDamping: number
): { position: Vector2; velocity: Vector2 } {
  let currentPos = copy(ballPos);
  let currentVel = copy(ballVel);
  
  // 最多迭代3次处理多面碰撞
  const maxIterations = 3;
  for (let iter = 0; iter < maxIterations; iter++) {
    const collision = detectCollision(currentPos, ballRadius, hex);
    
    if (!collision.collided) {
      break;
    }
    
    // 位置修正：将球推出穿透区域
    const correction = scale(collision.normal, -collision.penetration);
    currentPos = add(currentPos, correction);
    
    // 计算接触点相对于六边形中心的位置
    const relPos = getRelativePosition(currentPos, hex);
    const contactPoint = sub(relPos, scale(collision.normal, ballRadius));
    
    // 计算墙面速度
    const wallVel = getWallVelocity(contactPoint, hex.omega);
    
    // 计算碰撞响应
    currentVel = computeCollisionResponse(
      currentVel,
      collision.normal,
      wallVel,
      restitution,
      tangentDamping
    );
  }
  
  // 速度阈值处理，避免数值抖动
  const speedThreshold = 10; // 像素/秒
  const speed = Math.sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
  if (speed < speedThreshold) {
    currentVel = vec2(0, 0);
  }
  
  return {
    position: currentPos,
    velocity: currentVel
  };
}
