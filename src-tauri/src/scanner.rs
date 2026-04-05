//! 扫描器模块，负责文件扫描、元数据提取和图像处理

use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// 扫描期间发现的书籍文件信息
#[derive(Debug)]
pub struct ScannedBook {
    pub path: PathBuf,
    pub title: String,
    pub file_size: i64,
    pub hash: String,
    pub page_count: i64,
    pub format: BookFormat,
}

/// 支持的书籍格式
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BookFormat {
    Cbz,  // .cbz / .zip — 漫画存档
    Epub, // .epub — 电子书（包含 XHTML 和图像的 ZIP 容器）
    Mobi, // .mobi — Kindle 电子书
}

impl BookFormat {
    /// 转换为字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            BookFormat::Cbz => "cbz",
            BookFormat::Epub => "epub",
            BookFormat::Mobi => "mobi",
        }
    }

    /// 从扩展名解析格式
    pub fn from_extension(ext: &str) -> Option<BookFormat> {
        match ext.to_lowercase().as_str() {
            "cbz" | "zip" => Some(BookFormat::Cbz),
            "epub" => Some(BookFormat::Epub),
            "mobi" => Some(BookFormat::Mobi),
            _ => None,
        }
    }
}

/// 检测文件格式
fn detect_format(path: &Path) -> Option<BookFormat> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .and_then(BookFormat::from_extension)
}

/// 递归扫描目录以查找支持的书籍文件
pub fn scan_directory(dir: &Path) -> Vec<PathBuf> {
    WalkDir::new(dir)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file() && detect_format(e.path()).is_some())
        .map(|e| e.into_path())
        .collect()
}

/// 计算文件的快速哈希（为提高速度，仅取前 64KB + 文件大小）
pub fn compute_file_hash(path: &Path) -> Result<String, Box<dyn std::error::Error>> {
    let mut file = File::open(path)?;
    let metadata = file.metadata()?;
    let file_size = metadata.len();

    let mut hasher = Sha256::new();
    hasher.update(file_size.to_le_bytes());

    let mut buffer = vec![0u8; 65536.min(file_size as usize)];
    let bytes_read = file.read(&mut buffer)?;
    hasher.update(&buffer[..bytes_read]);

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

// ─── CBZ/ZIP 辅助函数 ───

/// 获取 ZIP 内部的图像文件名列表，按自然排序
pub fn list_zip_images(path: &Path) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    let mut images: Vec<String> = Vec::new();
    for i in 0..archive.len() {
        let entry = archive.by_index(i)?;
        let name = entry.name().to_string();

        if entry.is_dir() || name.starts_with("__MACOSX") || name.starts_with('.') {
            continue;
        }

        if is_image_filename(&name) {
            images.push(name);
        }
    }

    images.sort_by(|a, b| natord::compare(a, b));
    Ok(images)
}

/// 从 ZIP 存档中提取特定文件并返回字节流
pub fn extract_file_from_zip(zip_path: &Path, filename: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let file = File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    let mut entry = archive.by_name(filename)?;

    let mut buffer = Vec::with_capacity(entry.size() as usize);
    entry.read_to_end(&mut buffer)?;
    Ok(buffer)
}

/// 从 CBZ 提取封面：存档中的第一张图像
fn extract_cbz_cover(path: &Path, max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let images = list_zip_images(path)?;
    let first_image = images.first()
        .ok_or("No images found in CBZ archive")?;

    let raw_bytes = extract_file_from_zip(path, first_image)?;
    resize_to_webp(&raw_bytes, max_height)
}

// ─── EPUB 辅助函数 ───

/// 从 EPUB 文件中提取封面图像。
///
/// EPUB 是一个 ZIP。我们按以下优先级顺序查找封面：
/// 1. 解析 META-INF/container.xml → 查找 OPF 路径
/// 2. 解析 OPF → 查找 <meta name="cover" content="id"/> 或 <item properties="cover-image"/>
/// 3. 回退：查找 ZIP 中的第一张图像
fn extract_epub_cover(path: &Path, max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    // 第一步：从 container.xml 查找 OPF 文件路径
    let opf_path = find_opf_path(&mut archive)?;
    let opf_dir = opf_path.rsplit_once('/').map(|(d, _)| d.to_string()).unwrap_or_default();

    // 第二步：读取 OPF 并查找封面图像的 href
    let opf_content = {
        let mut entry = archive.by_name(&opf_path)?;
        let mut s = String::new();
        entry.read_to_string(&mut s)?;
        s
    };

    if let Some(cover_href) = find_cover_href_in_opf(&opf_content) {
        let full_path = if opf_dir.is_empty() {
            cover_href
        } else {
            format!("{}/{}", opf_dir, cover_href)
        };

        if let Ok(bytes) = extract_zip_entry(&mut archive, &full_path) {
            return resize_to_webp(&bytes, max_height);
        }
    }

    // 回退：查找 ZIP 中的第一张图像
    let mut image_names: Vec<String> = Vec::new();
    for i in 0..archive.len() {
        if let Ok(entry) = archive.by_index(i) {
            let name = entry.name().to_string();
            if !entry.is_dir() && is_image_filename(&name) {
                image_names.push(name);
            }
        }
    }
    image_names.sort_by(|a, b| natord::compare(a, b));

    if let Some(first) = image_names.first() {
        let bytes = extract_zip_entry(&mut archive, first)?;
        return resize_to_webp(&bytes, max_height);
    }

    Err("No cover image found in EPUB".into())
}

/// 统计 EPUB 中的“页数”——我们遵循脊柱（spine）顺序并计算至少引用了一个图像的页面。
fn count_epub_pages(path: &Path) -> Result<i64, Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    let images = list_epub_images_by_spine(&mut archive)?;
    Ok(images.len().max(1) as i64)
}

/// 根据 EPUB 脊柱构建有序的图像路径列表。
///
/// 流程：OPF 脊柱 → 每个 XHTML 页面 → 提取该页面引用的第一个图像 src 或 xlink:href。返回完整的 ZIP 入口路径。
pub fn list_epub_images_by_spine(
    archive: &mut zip::ZipArchive<File>,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let opf_path = find_opf_path(archive)?;
    let opf_dir = opf_path
        .rsplit_once('/')
        .map(|(d, _)| d.to_string())
        .unwrap_or_default();

    let opf_content = {
        let mut entry = archive.by_name(&opf_path)?;
        let mut s = String::new();
        entry.read_to_string(&mut s)?;
        s
    };

    // 构建清单：ID → href
    let mut manifest: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for line in opf_content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("<item") {
            if let (Some(id), Some(href)) = (extract_attr(trimmed, "id"), extract_attr(trimmed, "href")) {
                manifest.insert(id, href);
            }
        }
    }

    // 解析脊柱 ID 引用（有序）
    let spine_re_pattern = "idref=\"";
    let mut spine_ids: Vec<String> = Vec::new();
    for line in opf_content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("<itemref") {
            if let Some(pos) = trimmed.find(spine_re_pattern) {
                let start = pos + spine_re_pattern.len();
                if let Some(end) = trimmed[start..].find('"') {
                    spine_ids.push(trimmed[start..start + end].to_string());
                }
            }
        }
    }

    // 对于每个脊柱条目，读取 XHTML 并找到第一个图像引用
    let mut result: Vec<String> = Vec::new();
    for sid in &spine_ids {
        let href = match manifest.get(sid) {
            Some(h) => h.clone(),
            None => continue,
        };

        let xhtml_path = if opf_dir.is_empty() {
            href.clone()
        } else {
            format!("{}/{}", opf_dir, href)
        };

        let xhtml_content = match archive.by_name(&xhtml_path) {
            Ok(mut entry) => {
                let mut s = String::new();
                entry.read_to_string(&mut s).unwrap_or_default();
                s
            }
            Err(_) => continue,
        };

        // 查找图像引用：src="..." 或 xlink:href="..."
        if let Some(img_ref) = find_image_ref_in_xhtml(&xhtml_content) {
            // 根据 XHTML 的目录解析相对路径
            let xhtml_dir = xhtml_path
                .rsplit_once('/')
                .map(|(d, _)| d.to_string())
                .unwrap_or_default();

            let full_img_path = resolve_relative_path(&xhtml_dir, &img_ref);

            // 验证条目是否存在于存档中
            if archive.by_name(&full_img_path).is_ok() {
                result.push(full_img_path);
            }
        }
    }

    Ok(result)
}

/// 在 XHTML 字符串中查找第一个图像 src/href
fn find_image_ref_in_xhtml(xhtml: &str) -> Option<String> {
    // 查找 <img src="...">、<image xlink:href="..."> 或 src="..."
    // 按漫画 EPUB 的可能性顺序尝试模式

    // 模式 1：src="..." (<img> 标签中最常用)
    for attr in &["src=\"", "xlink:href=\""] {
        let mut search_from = 0;
        while let Some(pos) = xhtml[search_from..].find(attr) {
            let abs_pos = search_from + pos;
            let start = abs_pos + attr.len();
            if let Some(end) = xhtml[start..].find('"') {
                let value = &xhtml[start..start + end];
                if is_image_filename(value) {
                    return Some(value.to_string());
                }
            }
            search_from = abs_pos + attr.len();
        }
    }

    None
}

/// 根据基础目录解析相对路径（可能包含 ../）
fn resolve_relative_path(base_dir: &str, relative: &str) -> String {
    if !relative.starts_with("../") && !relative.starts_with("./") {
        // 已经是相对于当前目录或 ZIP 内的绝对路径
        if base_dir.is_empty() {
            return relative.to_string();
        }
        return format!("{}/{}", base_dir, relative);
    }

    let mut parts: Vec<&str> = if base_dir.is_empty() {
        Vec::new()
    } else {
        base_dir.split('/').collect()
    };

    for segment in relative.split('/') {
        match segment {
            ".." => { parts.pop(); }
            "." => {}
            other => parts.push(other),
        }
    }

    parts.join("/")
}

/// 从 META-INF/container.xml 查找 OPF 文件路径
fn find_opf_path(archive: &mut zip::ZipArchive<File>) -> Result<String, Box<dyn std::error::Error>> {
    let mut entry = archive.by_name("META-INF/container.xml")?;
    let mut content = String::new();
    entry.read_to_string(&mut content)?;

    // 简单的无正则解析：在 <rootfile> 中查找 full-path="..."
    if let Some(pos) = content.find("full-path=\"") {
        let start = pos + 11;
        if let Some(end) = content[start..].find('"') {
            return Ok(content[start..start + end].to_string());
        }
    }

    Err("Cannot find OPF path in container.xml".into())
}

/// 从 OPF 内容中查找封面图像 href
fn find_cover_href_in_opf(opf: &str) -> Option<String> {
    // 策略 1：<item properties="cover-image" href="..."/> (EPUB 3)
    if let Some(href) = find_item_by_properties(opf, "cover-image") {
        return Some(href);
    }

    // 策略 2：<meta name="cover" content="cover-id"/> → <item id="cover-id" href="..."/>
    if let Some(cover_id) = find_meta_cover_id(opf) {
        if let Some(href) = find_item_href_by_id(opf, &cover_id) {
            return Some(href);
        }
    }

    // 策略 3：查找 ID 包含 "cover" 且媒体类型为图像的条目
    for line in opf.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("<item")
            && trimmed.contains("media-type=\"image/")
        {
            let id = extract_attr(trimmed, "id").unwrap_or_default().to_lowercase();
            if id.contains("cover") {
                if let Some(href) = extract_attr(trimmed, "href") {
                    return Some(href);
                }
            }
        }
    }

    None
}

/// 根据属性查找条目
fn find_item_by_properties(opf: &str, prop: &str) -> Option<String> {
    for line in opf.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("<item") {
            if let Some(props) = extract_attr(trimmed, "properties") {
                if props.split_whitespace().any(|p| p == prop) {
                    return extract_attr(trimmed, "href");
                }
            }
        }
    }
    None
}

/// 查找元数据封面 ID
fn find_meta_cover_id(opf: &str) -> Option<String> {
    for line in opf.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("<meta") && trimmed.contains("name=\"cover\"") {
            return extract_attr(trimmed, "content");
        }
    }
    None
}

/// 根据 ID 查找条目 href
fn find_item_href_by_id(opf: &str, id: &str) -> Option<String> {
    for line in opf.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("<item") {
            if let Some(item_id) = extract_attr(trimmed, "id") {
                if item_id == id {
                    return extract_attr(trimmed, "href");
                }
            }
        }
    }
    None
}

/// 简单的 XML 属性提取器：在标签字符串中查找 attr="value"
fn extract_attr(tag: &str, attr_name: &str) -> Option<String> {
    let pattern = format!("{}=\"", attr_name);
    if let Some(pos) = tag.find(&pattern) {
        let start = pos + pattern.len();
        if let Some(end) = tag[start..].find('"') {
            return Some(tag[start..start + end].to_string());
        }
    }
    None
}

/// 提取 ZIP 条目
fn extract_zip_entry(archive: &mut zip::ZipArchive<File>, name: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let mut entry = archive.by_name(name)?;
    let mut buffer = Vec::with_capacity(entry.size() as usize);
    entry.read_to_end(&mut buffer)?;
    Ok(buffer)
}

// ─── MOBI 辅助函数 ───

/// 从 MOBI 文件中提取封面图像
fn extract_mobi_cover(path: &Path, max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let book = mobi::Mobi::from_path(path)?;
    let images = book.image_records();

    let cover_record = images
        .first()
        .ok_or("No images found in MOBI file")?;

    resize_to_webp(cover_record.content, max_height)
}

/// 统计 MOBI 文件中的图像记录数（近似“页数”）
fn count_mobi_images(path: &Path) -> Result<i64, Box<dyn std::error::Error>> {
    let book = mobi::Mobi::from_path(path)?;
    let count = book.image_records().len();
    Ok(count.max(1) as i64)
}

// ─── 通用辅助函数 ───

/// 判断是否为图像文件名
fn is_image_filename(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.ends_with(".jpg")
        || lower.ends_with(".jpeg")
        || lower.ends_with(".png")
        || lower.ends_with(".webp")
        || lower.ends_with(".gif")
        || lower.ends_with(".bmp")
}

/// 解码图像字节流 → 调整大小 → 编码为 WebP
fn resize_to_webp(raw_bytes: &[u8], max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let img = image::load_from_memory(raw_bytes)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let resized = if img.height() > max_height {
        img.resize(u32::MAX, max_height, image::imageops::FilterType::Lanczos3)
    } else {
        img
    };

    let rgba = resized.to_rgba8();
    let (w, h) = (rgba.width(), rgba.height());
    let encoder = webp::Encoder::from_rgba(&rgba, w, h);
    let webp_data = encoder.encode(80.0);
    Ok(webp_data.to_vec())
}

// ─── 公开 API ───

/// 从任何支持的格式中提取封面缩略图
pub fn extract_cover(path: &Path, max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let format = detect_format(path)
        .ok_or("Unsupported file format")?;

    match format {
        BookFormat::Cbz => extract_cbz_cover(path, max_height),
        BookFormat::Epub => extract_epub_cover(path, max_height),
        BookFormat::Mobi => extract_mobi_cover(path, max_height),
    }
}

/// 处理单本书籍文件：哈希、统计页数、提取封面
/// 返回的结果会被上层扫描流程写入数据库，并用于生成书架缩略图。
pub fn process_book(
    path: &Path,
    covers_dir: &Path,
) -> Result<ScannedBook, Box<dyn std::error::Error>> {
    let format = detect_format(path)
        .ok_or("Unsupported file format")?;

    let title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let file_size = std::fs::metadata(path)?.len() as i64;
    let hash = compute_file_hash(path)?;

    // 根据格式统计页数
    let page_count = match format {
        BookFormat::Cbz => list_zip_images(path)?.len() as i64,
        BookFormat::Epub => count_epub_pages(path).unwrap_or(1),
        BookFormat::Mobi => count_mobi_images(path).unwrap_or(1),
    };

    // 提取封面缩略图（网格显示最大高度 600px）
    let cover_filename = format!("{}.webp", hash);
    let cover_path = covers_dir.join(&cover_filename);

    if !cover_path.exists() {
        match extract_cover(path, 600) {
            Ok(webp_bytes) => {
                std::fs::create_dir_all(covers_dir)?;
                std::fs::write(&cover_path, webp_bytes)?;
                log::info!("Cover extracted: {} ({}) → {:?}", title, format.as_str(), cover_path);
            }
            Err(e) => {
                log::warn!("Failed to extract cover for '{}' ({}): {}", title, format.as_str(), e);
            }
        }
    }

    Ok(ScannedBook {
        path: path.to_path_buf(),
        title,
        file_size,
        hash,
        page_count,
        format,
    })
}
