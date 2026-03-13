export const getAverageColor = (
  imageSrc: string,
  region: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      // Scale percentages to actual pixel dimensions
      const rX = (region.x / 100) * img.width;
      const rY = (region.y / 100) * img.height;
      const rW = (region.width / 100) * img.width;
      const rH = (region.height / 100) * img.height;

      if (rW <= 0 || rH <= 0) {
        reject(new Error("Invalid region dimensions"));
        return;
      }

      canvas.width = rW;
      canvas.height = rH;
      ctx.drawImage(img, rX, rY, rW, rH, 0, 0, rW, rH);

      const data = ctx.getImageData(0, 0, rW, rH).data;
      let r = 0,
        g = 0,
        b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      const count = data.length / 4;
      const toHex = (c: number) =>
        Math.min(255, Math.max(0, Math.round(c / count)))
          .toString(16)
          .padStart(2, "0");
      resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
    };
    img.onerror = () => reject(new Error("Failed to load image for sampling"));
    img.src = imageSrc;
  });
};
