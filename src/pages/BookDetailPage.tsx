/** 书籍详情页说明 */
import { Route } from "@/routes/book.$bookId";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

/**
 * 书籍详情页组件
 * @returns 渲染书籍详情信息
 */
export function BookDetailPage() {
  const { bookId } = Route.useParams();
  const navigate = useNavigate();

  return (
    <div>
      <button
        onClick={() => navigate({ to: "/library" })}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
      >
        <ArrowLeft size={16} />
        返回书架
      </button>
      <h1 className="text-xl font-semibold text-text-primary mb-4">书籍详情</h1>
      <p className="text-sm text-text-secondary">Book ID: {bookId}</p>
      <p className="text-sm text-text-tertiary mt-2">书籍详情页将在后续阶段实现。</p>
    </div>
  );
}
