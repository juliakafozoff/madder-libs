import copy from "clipboard-copy";

export async function shareOrCopy({ title, text, url, files }) {
  if (navigator.share) {
    try {
      const shareData = { title, text, url };
      if (files && navigator.canShare && navigator.canShare({ files })) {
        shareData.files = files;
      }
      await navigator.share(shareData);
      return { method: "shared" };
    } catch (err) {
      if (err.name === "AbortError") {
        return { method: "cancelled" };
      }
    }
  }
  await copy(url || text || "");
  return { method: "copied" };
}
