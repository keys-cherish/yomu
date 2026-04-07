/** 手势识别层组件 */
import { useCallback, useRef } from "react";

/** 手势状态接口 */
interface GestureState {
  /** 起始 X 坐标 */
  startX: number;
  /** 起始 Y 坐标 */
  startY: number;
  /** 开始时间戳 */
  startTime: number;
  /** 触点数量 */
  pointerCount: number;
  /** 是否正在滑动 */
  isSwiping: boolean;
  /** 指针类型 */
  pointerType: string;
}

/** 手势层属性 */
interface GestureLayerProps {
  /** 子组件 */
  children: React.ReactNode;
  /** 点击左侧区域回调 */
  onTapLeft: () => void;
  /** 点击右侧区域回调 */
  onTapRight: () => void;
  /** 点击中间区域回调 */
  onTapCenter: () => void;
  /** 向左滑动（下一页方向） */
  onSwipeLeft?: () => void;
  /** 向右滑动（上一页方向） */
  onSwipeRight?: () => void;
  /** 是否禁用手势 */
  disabled?: boolean;
  /** 是否允许原生水平滚动（卷轴模式时设为 true） */
  allowHorizontalPan?: boolean;
  /** 是否允许分页模式下的原生纵向滚动（适宽模式时设为 true） */
  allowVerticalPan?: boolean;
}

/** 最小水平滑动距离（像素） */
const SWIPE_MIN_DISTANCE = 50;
/** 最大滑动时间（毫秒） */
const SWIPE_MAX_TIME = 500;

/**
 * 手势识别层组件
 *
 * 使用 Pointer Events 区分点击与滑动：
 * - 点击（移动 < 10px, 时间 < 300ms）→ 根据区域执行翻页或切换工具栏
 * - 水平滑动（touch/pen 输入，移动 > 50px, dx > dy）→ 触发翻页
 * - 缩放 → 忽略多指缩放，由专门的缩放逻辑处理
 */
export function GestureLayer({
  children,
  onTapLeft,
  onTapRight,
  onTapCenter,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  allowHorizontalPan = false,
  allowVerticalPan = false,
}: GestureLayerProps) {
  const gestureRef = useRef<GestureState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /** 处理指针按下 */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      // 记录初始手势状态
      gestureRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
        pointerCount: 1,
        isSwiping: false,
        pointerType: e.pointerType,
      };
    },
    [disabled]
  );

  /** 处理指针移动 */
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g) return;
    const dx = Math.abs(e.clientX - g.startX);
    const dy = Math.abs(e.clientY - g.startY);
    // 移动超过 10px 视为滑动
    if (dx > 10 || dy > 10) {
      g.isSwiping = true;
    }
  }, []);

  /** 处理指针抬起 */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const g = gestureRef.current;
      if (!g) {
        gestureRef.current = null;
        return;
      }

      const elapsed = Date.now() - g.startTime;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // 滑动判定：触摸/笔输入，水平距离够大，水平 > 垂直，时间不超过限制
      if (
        g.isSwiping &&
        (g.pointerType === "touch" || g.pointerType === "pen") &&
        absDx > SWIPE_MIN_DISTANCE &&
        absDx > absDy * 1.5 &&
        elapsed < SWIPE_MAX_TIME
      ) {
        if (dx < 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (dx > 0 && onSwipeRight) {
          onSwipeRight();
        }
        gestureRef.current = null;
        return;
      }

      // 点击判定：移动距离 < 10px 且持续时间 < 300ms
      if (absDx < 10 && absDy < 10 && elapsed < 300) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) {
          gestureRef.current = null;
          return;
        }

        // 计算相对于容器宽度的点击位置
        const relativeX = (e.clientX - rect.left) / rect.width;

        // 根据点击区域（左/中/右各 1/3）触发回调
        if (relativeX < 0.33) {
          onTapLeft();
        } else if (relativeX > 0.66) {
          onTapRight();
        } else {
          onTapCenter();
        }
      }

      gestureRef.current = null;
    },
    [onTapLeft, onTapRight, onTapCenter, onSwipeLeft, onSwipeRight]
  );

  const handlePointerCancel = useCallback(() => {
    gestureRef.current = null;
  }, []);

  const touchAction = allowHorizontalPan ? "auto" : allowVerticalPan ? "pan-y pinch-zoom" : "pan-y";

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="relative flex-1 flex flex-col min-h-0"
      style={{ touchAction }}
    >
      {children}
    </div>
  );
}
