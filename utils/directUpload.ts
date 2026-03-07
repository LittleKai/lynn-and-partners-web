export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

function uploadWithProgress(
  file: File,
  uploadUrl: string,
  onProgress?: (p: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Dropbox upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

export async function directUpload(
  file: File,
  locationName: string,
  subfolder?: string,
  onProgress?: (p: UploadProgress) => void
): Promise<{ url: string; publicId: string; resourceType: string }> {
  // Step 1: Get a temporary Dropbox upload link from Vercel
  const tempRes = await fetch("/api/upload/temp-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, locationName, subfolder }),
  });
  if (!tempRes.ok) {
    const err = await tempRes.json().catch(() => ({}));
    throw new Error(err.error || `temp-link failed: ${tempRes.status}`);
  }
  const { uploadUrl, dropboxPath, resourceType } = await tempRes.json();

  // Step 2: Upload file bytes directly to Dropbox (bypasses Vercel)
  await uploadWithProgress(file, uploadUrl, onProgress);

  // Step 3: Create shared link via Vercel (tiny JSON request)
  const commitRes = await fetch("/api/upload/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dropboxPath, resourceType }),
  });
  if (!commitRes.ok) {
    const err = await commitRes.json().catch(() => ({}));
    throw new Error(err.error || `commit failed: ${commitRes.status}`);
  }
  return commitRes.json();
}
