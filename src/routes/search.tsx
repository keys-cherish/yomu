/** 搜索路由说明 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { SearchPage } from "@/pages/SearchPage";

/** 搜索页 URL 参数校验规则 */
const searchParamsSchema = z.object({
  q: z.string().default(""),
  tag: z.string().optional(),
  sort: z.enum(["relevance", "title", "recent"]).default("relevance"),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchParamsSchema,
  component: SearchPage,
});
