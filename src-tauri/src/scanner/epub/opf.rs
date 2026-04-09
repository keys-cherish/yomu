use std::fs::File;
use std::io::Read;

pub(super) fn find_opf_path(archive: &mut zip::ZipArchive<File>) -> Result<String, Box<dyn std::error::Error>> {
    let mut entry = archive.by_name("META-INF/container.xml")?;
    let mut content = String::new();
    entry.read_to_string(&mut content)?;

    // 支持双引号和单引号两种写法
    if let Some(val) = extract_attr_from_str(&content, "full-path") {
        return Ok(val);
    }

    Err("Cannot find OPF path in container.xml".into())
}

pub(super) fn find_cover_href_in_opf(opf: &str) -> Option<String> {
    if let Some(href) = find_item_by_properties(opf, "cover-image") {
        return Some(href);
    }

    if let Some(cover_id) = find_meta_cover_id(opf) {
        if let Some(href) = find_item_href_by_id(opf, &cover_id) {
            return Some(href);
        }
    }

    for line in opf.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("<item")
            && (trimmed.contains("media-type=\"image/") || trimmed.contains("media-type='image/"))
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

fn find_meta_cover_id(opf: &str) -> Option<String> {
    for line in opf.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("<meta")
            && (trimmed.contains("name=\"cover\"") || trimmed.contains("name='cover'"))
        {
            return extract_attr(trimmed, "content");
        }
    }
    None
}

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

/// 从 XML 标签片段中提取属性值，同时支持双引号和单引号。
pub(super) fn extract_attr(tag: &str, attr_name: &str) -> Option<String> {
    // 先尝试双引号 attr="val"
    let dq = format!("{}=\"", attr_name);
    if let Some(pos) = tag.find(&dq) {
        let start = pos + dq.len();
        if let Some(end) = tag[start..].find('"') {
            return Some(tag[start..start + end].to_string());
        }
    }
    // 再尝试单引号 attr='val'
    let sq = format!("{}='", attr_name);
    if let Some(pos) = tag.find(&sq) {
        let start = pos + sq.len();
        if let Some(end) = tag[start..].find('\'') {
            return Some(tag[start..start + end].to_string());
        }
    }
    None
}

/// 在完整文本（非按行）中提取属性值，用于 container.xml 等可能跨行的场景。
fn extract_attr_from_str(text: &str, attr_name: &str) -> Option<String> {
    let dq = format!("{}=\"", attr_name);
    if let Some(pos) = text.find(&dq) {
        let start = pos + dq.len();
        if let Some(end) = text[start..].find('"') {
            return Some(text[start..start + end].to_string());
        }
    }
    let sq = format!("{}='", attr_name);
    if let Some(pos) = text.find(&sq) {
        let start = pos + sq.len();
        if let Some(end) = text[start..].find('\'') {
            return Some(text[start..start + end].to_string());
        }
    }
    None
}
