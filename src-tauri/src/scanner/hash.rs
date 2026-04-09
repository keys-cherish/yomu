use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

use sha2::{Digest, Sha256};

/// 每个采样点读取的字节数
const SAMPLE_SIZE: usize = 65536; // 64KB
/// 小于此阈值的文件做全量哈希，大于的做多点采样
const FULL_HASH_THRESHOLD: u64 = 8 * 1024 * 1024; // 8MB

/// 计算文件的内容哈希。
///
/// - **≤ 8MB**：全量读取做 SHA-256（完全无碰撞风险）
/// - **> 8MB**：采样 开头 / 25% / 50% / 75% / 末尾 各 64KB + 文件大小
///
/// 相比只读前 64KB 的旧版本，碰撞概率降低了数个数量级。（修 P0-5）
pub fn compute_file_hash(path: &Path) -> Result<String, Box<dyn std::error::Error>> {
    let mut file = File::open(path)?;
    let file_size = file.metadata()?.len();

    let mut hasher = Sha256::new();
    hasher.update(file_size.to_le_bytes());

    if file_size <= FULL_HASH_THRESHOLD {
        // 小文件：全量哈希
        let mut buffer = Vec::with_capacity(file_size as usize);
        file.read_to_end(&mut buffer)?;
        hasher.update(&buffer);
    } else {
        // 大文件：多点采样
        let offsets: [u64; 5] = [
            0,
            file_size / 4,
            file_size / 2,
            file_size * 3 / 4,
            file_size.saturating_sub(SAMPLE_SIZE as u64),
        ];

        let mut buffer = vec![0u8; SAMPLE_SIZE];
        for offset in offsets {
            file.seek(SeekFrom::Start(offset))?;
            let bytes_read = file.read(&mut buffer)?;
            hasher.update(&buffer[..bytes_read]);
        }
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}
