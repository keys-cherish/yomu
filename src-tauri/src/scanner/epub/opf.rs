use std::fs::File;
use std::io::Read;

pub(super) fn find_opf_path(archive: &mut zip::ZipArchive<File>) -> Result<String, Box<dyn std::error::Error>> {
    let mut entry = archive.by_name("META-INF/container.xml")?;
    let mut content = String::new();
    entry.read_to_string(&mut content)?;

    if let Some(pos) = content.find("full-path=\"") {
        let start = pos + 11;
        if let Some(end) = content[start..].find('"') {
            return Ok(content[start..start + end].to_string());
        }
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
        if trimmed.starts_with("<meta") && trimmed.contains("name=\"cover\"") {
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
