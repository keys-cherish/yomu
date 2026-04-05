/** 图书馆路由说明 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { LibraryPage } from "@/pages/LibraryPage";

const librarySearchSchema = z.object({
  tag: z.string().optional(),
  sort: z.enum(["recent", "title", "added"]).default("recent"),
  view: z.enum(["grid", "list"]).default("grid"),
});

export const Route = createFileRoute("/library")({
  validateSearch: librarySearchSchema,
  component: LibraryPage,
});
