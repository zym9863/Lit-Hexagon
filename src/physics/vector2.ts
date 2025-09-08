/**
 * 2D向量类型定义
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * 创建一个新的2D向量
 * @param x - X坐标值
 * @param y - Y坐标值
 * @returns 新的向量对象
 */
export function vec2(x: number = 0, y: number = 0): Vector2 {
  return { x, y };
}

/**
 * 向量加法运算
 * @param a - 第一个向量
 * @param b - 第二个向量
 * @param result - 可选的结果向量，用于避免创建新对象
 * @returns 相加后的向量
 */
export function add(a: Vector2, b: Vector2, result?: Vector2): Vector2 {
  if (result) {
    result.x = a.x + b.x;
    result.y = a.y + b.y;
    return result;
  }
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * 向量减法运算
 * @param a - 被减向量
 * @param b - 减向量
 * @param result - 可选的结果向量，用于避免创建新对象
 * @returns 相减后的向量
 */
export function sub(a: Vector2, b: Vector2, result?: Vector2): Vector2 {
  if (result) {
    result.x = a.x - b.x;
    result.y = a.y - b.y;
    return result;
  }
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * 向量标量乘法
 * @param v - 向量
 * @param scalar - 标量值
 * @param result - 可选的结果向量，用于避免创建新对象
 * @returns 缩放后的向量
 */
export function scale(v: Vector2, scalar: number, result?: Vector2): Vector2 {
  if (result) {
    result.x = v.x * scalar;
    result.y = v.y * scalar;
    return result;
  }
  return { x: v.x * scalar, y: v.y * scalar };
}

/**
 * 计算向量点积
 * @param a - 第一个向量
 * @param b - 第二个向量
 * @returns 点积结果
 */
export function dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * 计算向量的长度（模）
 * @param v - 向量
 * @returns 向量长度
 */
export function length(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * 计算向量长度的平方（避免开方运算）
 * @param v - 向量
 * @returns 向量长度的平方
 */
export function lengthSquared(v: Vector2): number {
  return v.x * v.x + v.y * v.y;
}

/**
 * 向量归一化（单位化）
 * @param v - 待归一化的向量
 * @param result - 可选的结果向量，用于避免创建新对象
 * @returns 归一化后的向量
 */
export function normalize(v: Vector2, result?: Vector2): Vector2 {
  const len = length(v);
  if (len === 0) {
    if (result) {
      result.x = 0;
      result.y = 0;
      return result;
    }
    return { x: 0, y: 0 };
  }
  return scale(v, 1 / len, result);
}

/**
 * 限制向量的最大长度
 * @param v - 向量
 * @param maxLength - 最大长度
 * @param result - 可选的结果向量，用于避免创建新对象
 * @returns 限制后的向量
 */
export function clampLength(v: Vector2, maxLength: number, result?: Vector2): Vector2 {
  const len = length(v);
  if (len <= maxLength) {
    if (result) {
      result.x = v.x;
      result.y = v.y;
      return result;
    }
    return { x: v.x, y: v.y };
  }
  return scale(v, maxLength / len, result);
}

/**
 * 获取向量的垂直向量（逆时针旋转90度）
 * @param v - 原向量
 * @param result - 可选的结果向量，用于避免创建新对象
 * @returns 垂直向量
 */
export function perp(v: Vector2, result?: Vector2): Vector2 {
  if (result) {
    result.x = -v.y;
    result.y = v.x;
    return result;
  }
  return { x: -v.y, y: v.x };
}

/**
 * 旋转向量
 * @param v - 待旋转的向量
 * @param angle - 旋转角度（弧度制）
 * @param result - 可选的结果向量，用于避免创建新对象
 * @returns 旋转后的向量
 */
export function rotate(v: Vector2, angle: number, result?: Vector2): Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = v.x * cos - v.y * sin;
  const y = v.x * sin + v.y * cos;
  
  if (result) {
    result.x = x;
    result.y = y;
    return result;
  }
  return { x, y };
}

/**
 * 从角度创建单位向量
 * @param angle - 角度（弧度制）
 * @param result - 可选的结果向量，用于避免创建新对象
 * @returns 指定方向的单位向量
 */
export function fromAngle(angle: number, result?: Vector2): Vector2 {
  if (result) {
    result.x = Math.cos(angle);
    result.y = Math.sin(angle);
    return result;
  }
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/**
 * 计算向量在法线上的反射
 * @param v - 入射向量
 * @param n - 法线向量（应为单位向量）
 * @param result - 可选的结果向量，用于避免创建新对象
 * @returns 反射向量
 */
export function reflect(v: Vector2, n: Vector2, result?: Vector2): Vector2 {
  const dotVN = dot(v, n);
  const x = v.x - 2 * dotVN * n.x;
  const y = v.y - 2 * dotVN * n.y;
  
  if (result) {
    result.x = x;
    result.y = y;
    return result;
  }
  return { x, y };
}

/**
 * 复制向量
 * @param v - 源向量
 * @param result - 可选的结果向量，用于避免创建新对象
 * @returns 复制的向量
 */
export function copy(v: Vector2, result?: Vector2): Vector2 {
  if (result) {
    result.x = v.x;
    result.y = v.y;
    return result;
  }
  return { x: v.x, y: v.y };
}

/**
 * 设置向量的值
 * @param v - 目标向量
 * @param x - X坐标值
 * @param y - Y坐标值
 * @returns 修改后的向量
 */
export function set(v: Vector2, x: number, y: number): Vector2 {
  v.x = x;
  v.y = y;
  return v;
}
