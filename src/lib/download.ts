/**
 * Triggers a client-side JSON download.
 *
 * The object URL is revoked on a later task rather than immediately after
 * `click()`. Revoking synchronously can cancel the download while it is still
 * being handed to the browser (defect 21).
 */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';

  // Firefox requires the anchor to be in the document for the click to count.
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 0);
}

/** `huna-backup-2026-08-17.json` */
export function backupFilename(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `huna-backup-${year}-${month}-${day}.json`;
}
