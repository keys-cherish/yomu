import type { LucideIcon } from "lucide-react";
import type { ReadingMode, ReadingDirection, FitMode } from "@/stores/settings";

export interface BookInfo {
  id: number;
  hash: string;
  title: string;
  page_count: number | null;
  read_progress: number;
  format: string;
}

export interface ReaderOption<T extends string> {
  value: T;
  icon: LucideIcon;
  label: string;
}

export interface ReaderModeOption extends ReaderOption<ReadingMode> {}
export interface ReaderDirectionOption extends ReaderOption<ReadingDirection> {}
export interface ReaderFitOption extends ReaderOption<FitMode> {}
