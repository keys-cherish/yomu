use std::fs::File;
use std::io::Read;

use super::opf::find_opf_path;
use super::xhtml::{find_image_ref_in_xhtml, resolve_relative_path};

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

        if let Some(img_ref) = find_image_ref_in_xhtml(&xhtml_content) {
            let xhtml_dir = xhtml_path
                .rsplit_once('/')
                .map(|(d, _)| d.to_string())
                .unwrap_or_default();

            let full_img_path = resolve_relative_path(&xhtml_dir, &img_ref);

            if archive.by_name(&full_img_path).is_ok() {
                result.push(full_img_path);
            }
        }
    }

    Ok(result)
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
