use std::fs::File;
use std::io::Read;
use std::path::Path;

use super::opf::{find_cover_href_in_opf, find_opf_path};

pub(crate) fn extract_epub_cover(path: &Path, max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    let opf_path = find_opf_path(&mut archive)?;
    let opf_dir = opf_path.rsplit_once('/').map(|(d, _)| d.to_string()).unwrap_or_default();

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
            return super::super::image::resize_to_webp(&bytes, max_height);
        }
    }

    let mut image_names: Vec<String> = Vec::new();
    for i in 0..archive.len() {
        if let Ok(entry) = archive.by_index(i) {
            let name = entry.name().to_string();
            if !entry.is_dir() && super::super::image::is_image_filename(&name) {
                image_names.push(name);
            }
        }
    }
    image_names.sort_by(|a, b| natord::compare(a, b));

    if let Some(first) = image_names.first() {
        let bytes = extract_zip_entry(&mut archive, first)?;
        return super::super::image::resize_to_webp(&bytes, max_height);
    }

    Err("No cover image found in EPUB".into())
}

pub(crate) fn count_epub_pages(path: &Path) -> Result<i64, Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    let images = super::spine::list_epub_images_by_spine(&mut archive)?;
    Ok(images.len().max(1) as i64)
}

fn extract_zip_entry(archive: &mut zip::ZipArchive<File>, name: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let mut entry = archive.by_name(name)?;
    let mut buffer = Vec::with_capacity(entry.size() as usize);
    entry.read_to_end(&mut buffer)?;
    Ok(buffer)
}
