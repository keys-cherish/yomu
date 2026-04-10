/** 与后端 Rust Book 结构体一一对应的前端类型 */
export interface Book {
  id: number;
  library_id: number | null;
  hash: string;
  title: string;
  path: string;
  file_size: number | null;
  page_count: number | null;
  cover_path: string | null;
  format: string;
  read_progress: number;
  is_favorite: boolean;
  added_at: number;
  series_name: string | null;
}

/** 书库信息 */
export interface Library {
  id: number;
  path: string;
  name: string | null;
  created_at: number;
  last_scan: number | null;
}
