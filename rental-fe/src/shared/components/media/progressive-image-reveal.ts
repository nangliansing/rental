export async function decodeProgressiveImage(image: HTMLImageElement) {
  try {
    if (typeof image.decode === "function") {
      await image.decode()
    }
  } catch {
    // decode() can reject for unsupported images; load still succeeded.
  }
}
