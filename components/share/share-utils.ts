/**
 * Attempt to share a file using the Web Share API. If it is unsupported
 * or throws an error (except for AbortError which is user cancellation),
 * fallback to triggering a browser download of the file.
 */
export async function shareOrDownloadFile(file: File, title: string = "GDG Wrapped 25/26"): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // user cancelled the share dialog
      }
      // fall through to download fallback
    }
  }

  // Fallback to download
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
