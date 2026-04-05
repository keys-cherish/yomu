pub(super) fn find_image_ref_in_xhtml(xhtml: &str) -> Option<String> {
    for attr in &["src=\"", "xlink:href=\""] {
        let mut search_from = 0;
        while let Some(pos) = xhtml[search_from..].find(attr) {
            let abs_pos = search_from + pos;
            let start = abs_pos + attr.len();
            if let Some(end) = xhtml[start..].find('"') {
                let value = &xhtml[start..start + end];
                if super::super::image::is_image_filename(value) {
                    return Some(value.to_string());
                }
            }
            search_from = abs_pos + attr.len();
        }
    }

    None
}

pub(super) fn resolve_relative_path(base_dir: &str, relative: &str) -> String {
    if !relative.starts_with("../") && !relative.starts_with("./") {
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
            ".." => {
                parts.pop();
            }
            "." => {}
            other => parts.push(other),
        }
    }

    parts.join("/")
}
