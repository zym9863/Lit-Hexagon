import type { Vector2 } from './vector2.js';
import { vec2, rotate, fromAngle } from './vector2.js';

/**
 * 六边形状态接口
 */
export interface HexagonState {
  center: Vector2;     // 中心位置
  apothem: number;     // 内切圆半径（中心到边的距离）
  theta: number;       // 当前旋转角度（弧度）
  omega: number;       // 角速度（弧度/秒）
}

/**
 * 创建新的六边形状态
 * @param centerX - 中心X坐标
 * @param centerY - 中心Y坐标
 * @param apothem - 内切圆半径
 * @param omega - 角速度
 * @returns 六边形状态对象
 */
export function createHexagon(
  centerX: number,
  centerY: number,
  apothem: number,
  omega: number = 0.6
): HexagonState {
  return {
    center: vec2(centerX, centerY),
    apothem,
    theta: 0,
    omega
  };
}

/**
 * 获取六边形的六条边的法线（体坐标系）
 * @returns 六条边的单位法线向量数组
 */
export function getBodyNormals(): Vector2[] {
  const normals: Vector2[] = [];
  for (let i = 0; i < 6; i++) {
    // 六边形的法线方向：0°, 60°, 120°, 180°, 240°, 300°
    const angle = (i * Math.PI) / 3;
    normals.push(fromAngle(angle));
  }
  return normals;
}

/**
 * 获取六边形的六条边的法线（世界坐标系）
 * @param theta - 当前旋转角度
 * @returns 旋转后的六条边法线向量数组
 */
export function getWorldNormals(theta: number): Vector2[] {
  const bodyNormals = getBodyNormals();
  return bodyNormals.map(normal => rotate(normal, theta));
}

/**
 * 获取六边形的顶点（体坐标系）
 * @param apothem - 内切圆半径
 * @returns 六个顶点的坐标数组
 */
export function getBodyVertices(apothem: number): Vector2[] {
  const vertices: Vector2[] = [];
  const radius = apothem / Math.cos(Math.PI / 6); // 外接圆半径
  
  for (let i = 0; i < 6; i++) {
    // 顶点角度：30°, 90°, 150°, 210°, 270°, 330°
    const angle = (Math.PI / 6) + (i * Math.PI / 3);
    vertices.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    });
  }
  
  return vertices;
}

/**
 * 获取六边形的顶点（世界坐标系）
 * @param hex - 六边形状态
 * @returns 世界坐标系中的六个顶点
 */
export function getWorldVertices(hex: HexagonState): Vector2[] {
  const bodyVertices = getBodyVertices(hex.apothem);
  return bodyVertices.map(vertex => {
    const rotated = rotate(vertex, hex.theta);
    return {
      x: rotated.x + hex.center.x,
      y: rotated.y + hex.center.y
    };
  });
}

/**
 * 更新六边形的旋转角度
 * @param hex - 六边形状态
 * @param dt - 时间步长
 */
export function updateRotation(hex: HexagonState, dt: number): void {
  hex.theta += hex.omega * dt;
  // 保持角度在0-2π范围内
  while (hex.theta > Math.PI * 2) {
    hex.theta -= Math.PI * 2;
  }
  while (hex.theta < 0) {
    hex.theta += Math.PI * 2;
  }
}

/**
 * 计算点到六边形中心的相对位置
 * @param point - 世界坐标系中的点
 * @param hex - 六边形状态
 * @returns 相对于六边形中心的位置向量
 */
export function getRelativePosition(point: Vector2, hex: HexagonState): Vector2 {
  return {
    x: point.x - hex.center.x,
    y: point.y - hex.center.y
  };
}

/**
 * 检查点是否在六边形内部
 * @param point - 世界坐标系中的点
 * @param hex - 六边形状态
 * @param margin - 边界余量（用于球体碰撞）
 * @returns 是否在六边形内部
 */
export function isPointInHexagon(
  point: Vector2,
  hex: HexagonState,
  margin: number = 0
): boolean {
  const relPos = getRelativePosition(point, hex);
  const normals = getWorldNormals(hex.theta);
  const threshold = hex.apothem - margin;
  
  for (const normal of normals) {
    const distance = relPos.x * normal.x + relPos.y * normal.y;
    if (distance > threshold) {
      return false;
    }
  }
  
  return true;
}

/**
 * 获取六边形在Canvas上的绘制路径点
 * @param hex - 六边形状态
 * @returns 用于Canvas绘制的顶点数组
 */
export function getDrawPath(hex: HexagonState): Vector2[] {
  return getWorldVertices(hex);
}
