use std::path::Path;

/// WebDAV 客户端：负责把文件上传到 / 从 WebDAV 服务器下载。
/// 协议行为：
/// - 备份：MKCOL 创建目录 → PUT 上传文件
/// - 恢复：GET 下载文件
/// - 测试：PROPFIND 或 OPTIONS 检测连通性

/// 确保远程目录存在（MKCOL），忽略"已存在"错误
async fn ensure_remote_dir(
    client: &reqwest::Client,
    dir_url: &str,
    username: &str,
    password: &str,
) -> Result<(), String> {
    let resp = client
        .request(reqwest::Method::from_bytes(b"MKCOL").unwrap(), dir_url)
        .basic_auth(username, Some(password))
        .send()
        .await
        .map_err(|e| format!("MKCOL request failed: {}", e))?;

    let status = resp.status().as_u16();
    // 201 Created, 405 Already exists, 301 redirect — all acceptable
    if status == 201 || status == 405 || status == 301 || (200..=299).contains(&status) {
        Ok(())
    } else {
        Err(format!("MKCOL failed with status {}", status))
    }
}

/// 测试 WebDAV 连接
pub async fn test_connection(
    url: &str,
    username: &str,
    password: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let resp = client
        .request(reqwest::Method::OPTIONS, url)
        .basic_auth(username, Some(password))
        .send()
        .await
        .map_err(|e| format!("Connection failed: {}", e))?;

    if resp.status().is_success() || resp.status().as_u16() == 200 {
        Ok("Connected successfully".to_string())
    } else {
        Err(format!("Server responded with status {}", resp.status()))
    }
}

/// 上传本地文件到 WebDAV
pub async fn upload_file(
    url: &str,
    username: &str,
    password: &str,
    remote_dir: &str,
    remote_filename: &str,
    local_path: &Path,
) -> Result<u64, String> {
    let bytes = std::fs::read(local_path)
        .map_err(|e| format!("Failed to read local file: {}", e))?;
    let file_size = bytes.len() as u64;

    let client = reqwest::Client::new();

    // 确保远程目录存在
    let dir_url = format!("{}/{}/", url.trim_end_matches('/'), remote_dir);
    ensure_remote_dir(&client, &dir_url, username, password).await?;

    // PUT 上传
    let file_url = format!("{}{}", dir_url, remote_filename);
    let resp = client
        .put(&file_url)
        .basic_auth(username, Some(password))
        .header("Content-Type", "application/octet-stream")
        .body(bytes)
        .send()
        .await
        .map_err(|e| format!("Upload failed: {}", e))?;

    let status = resp.status().as_u16();
    if (200..=299).contains(&status) {
        Ok(file_size)
    } else {
        Err(format!("Upload failed with status {}", status))
    }
}

/// 从 WebDAV 下载文件到本地
pub async fn download_file(
    url: &str,
    username: &str,
    password: &str,
    remote_dir: &str,
    remote_filename: &str,
    local_path: &Path,
) -> Result<u64, String> {
    let client = reqwest::Client::new();
    let file_url = format!(
        "{}/{}/{}",
        url.trim_end_matches('/'),
        remote_dir,
        remote_filename
    );

    let resp = client
        .get(&file_url)
        .basic_auth(username, Some(password))
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Download failed with status {} (backup may not exist)",
            resp.status()
        ));
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;
    let file_size = bytes.len() as u64;

    std::fs::write(local_path, &bytes)
        .map_err(|e| format!("Failed to write local file: {}", e))?;

    Ok(file_size)
}
