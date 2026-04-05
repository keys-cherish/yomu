use std::fs::File;
use std::io::Read;
use std::path::Path;

use sha2::{Digest, Sha256};

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
