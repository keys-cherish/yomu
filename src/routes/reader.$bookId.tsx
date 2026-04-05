/** 阅读器路由说明 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { ReaderPage } from "@/pages/ReaderPage";

/** 阅读器页 URL 参数校验规则 */
const readerSearchSchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  zoom: z.coerce.number().min(1).max(5).default(1),
});

export const Route = createFileRoute("/reader/$bookId")({
  validateSearch: readerSearchSchema,
  component: ReaderPage,
});
