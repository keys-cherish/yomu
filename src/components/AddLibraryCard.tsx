/** 添加库卡片组件 */
import { Plus } from "lucide-react";

/** 添加库卡片属性 */
interface AddLibraryCardProps {
  /** 点击回调函数 */
  onClick: () => void;
  /** 是否禁用点击 */
  disabled?: boolean;
}

/**
 * 添加库卡片组件
 * 用于在书籍列表中显示一个“添加”按钮，通常用于导入新书籍或文件夹
 */
export function AddLibraryCard({ onClick, disabled }: AddLibraryCardProps) {
  return (
    <button
      className="w-[160px] aspect-[2/3] border-2 border-dashed border-accent rounded-[var(--radius-md)] flex items-center justify-center cursor-pointer bg-transparent hover:bg-accent/[0.06] hover:border-accent-hover transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      onClick={onClick}
      disabled={disabled}
      aria-label="添加书库"
    >
      {/* 加号图标用于提示用户导入新的书库目录 */}
      <Plus size={32} className="text-accent" strokeWidth={1.5} />
    </button>
  );
}
