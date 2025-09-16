import * as fs from "node:fs";

class Color {
  red: number;
  green: number;
  blue: number;

  constructor(red = 0, green = 0, blue = 0) {
    this.red = red;
    this.green = green;
    this.blue = blue;
  }
}

class Image {
  private pixels: Color[][];
  constructor(width: number, height: number) {
    this.pixels = Array.from({ length: width }, () =>
      Array.from({ length: height }, () => new Color())
    );
  }

  getWidth(): number {
    return this.pixels.length;
  }

  getHeight(): number {
    if (this.pixels.length === 0) {
      throw new Error("No pixels loaded");
    }
    return this.pixels[0]!.length;
  }

  set(x: number, y: number, c: Color): void {
    if (!this.pixels[x] || !this.pixels[x][y]) {
      throw new Error(`Invalid coordinates (${x}, ${y})`);
    }
    this.pixels[x][y] = c;
  }

  get(x: number, y: number): Color {
    if (!this.pixels[x] || !this.pixels[x][y]) {
      throw new Error(`Invalid coordinates (${x}, ${y})`);
    }
    return this.pixels[x][y];
  }
}

class ImageEditor {
  instructions(): void {
    console.log(
      "USAGE: java ImageEditor <in-file> <out-file> <grayscale|invert|emboss|motionblur> {motion-blur-length}"
    );
  }

  run(args: string[]): void {
    if (args.length < 3) {
      this.instructions();
      return;
    }
    console.log(args[0]);

    const inputFile = args[0];
    const outputFile = args[1];
    const filter = args[2];

    if (!inputFile) {
      throw new Error("Input file is required");
    }

    const image = this.read(inputFile);

    if (filter === "grayscale" || filter === "greyscale") {
      if (args.length !== 3) {
        this.instructions();
        return;
      }
      this.grayscale(image);
    } else if (filter === "invert") {
      if (args.length !== 3) {
        this.instructions();
        return;
      }
      this.invert(image);
    } else if (filter === "emboss") {
      if (args.length !== 3) {
        this.instructions();
        return;
      }
      this.emboss(image);
    } else if (filter === "motionblur") {
      if (args.length !== 4) {
        this.instructions();
        return;
      }
      const lengthStr = args[3];
      if (!lengthStr) {
        throw new Error("Motion blur length is required");
      }
      const length = parseInt(lengthStr, 10);
      if (isNaN(length) || length < 1) {
        this.instructions();
        return;
      }
      this.motionblur(image, length);
    } else {
      this.instructions();
      return;
    }

    if (!outputFile) {
      throw new Error("Output file is required");
    }

    this.write(image, outputFile);
  }

  private motionblur(image: Image, length: number): void {
    for (let x = 0; x < image.getWidth(); x++) {
      for (let y = 0; y < image.getHeight(); y++) {
        const curColor = image.get(x, y);

        let totalR = curColor.red;
        let totalG = curColor.green;
        let totalB = curColor.blue;

        const maxX = Math.min(image.getWidth() - 1, x + length - 1);
        for (let i = x + 1; i <= maxX; i++) {
          const tmpColor = image.get(i, y);
          totalR += tmpColor.red;
          totalG += tmpColor.green;
          totalB += tmpColor.blue;
        }

        const delta = maxX - x + 1;
        curColor.red = Math.floor(totalR / delta);
        curColor.green = Math.floor(totalG / delta);
        curColor.blue = Math.floor(totalB / delta);
      }
    }
  }

  private invert(image: Image): void {
    for (let x = 0; x < image.getWidth(); x++) {
      for (let y = 0; y < image.getHeight(); y++) {
        const curColor = image.get(x, y);
        curColor.red = 255 - curColor.red;
        curColor.green = 255 - curColor.green;
        curColor.blue = 255 - curColor.blue;
      }
    }
  }

  private grayscale(image: Image): void {
    for (let x = 0; x < image.getWidth(); x++) {
      for (let y = 0; y < image.getHeight(); y++) {
        const curColor = image.get(x, y);

        let grayLevel: number = Math.floor(
          (curColor.red + curColor.green + curColor.blue) / 3
        );
        grayLevel = Math.max(0, Math.min(255, grayLevel));

        curColor.red = grayLevel;
        curColor.green = grayLevel;
        curColor.blue = grayLevel;
      }
    }
  }

  private emboss(image: Image): void {
    for (let x = image.getWidth() - 1; x >= 0; x--) {
      for (let y = image.getHeight() - 1; y >= 0; --y) {
        const curColor = image.get(x, y);

        let diff = 0;
        if (x > 0 && y > 0) {
          const upLeftColor = image.get(x - 1, y - 1);
          if (Math.abs(curColor.red - upLeftColor.red) > Math.abs(diff)) {
            diff = curColor.red - upLeftColor.red;
          }
          if (Math.abs(curColor.green - upLeftColor.green) > Math.abs(diff)) {
            diff = curColor.green - upLeftColor.green;
          }
          if (Math.abs(curColor.blue - upLeftColor.blue) > Math.abs(diff)) {
            diff = curColor.blue - upLeftColor.blue;
          }
        }

        let grayLevel = 128 + diff;
        grayLevel = Math.max(0, Math.min(255, grayLevel));

        curColor.red = grayLevel;
        curColor.green = grayLevel;
        curColor.blue = grayLevel;
      }
    }
  }

  private read(filePath: string): Image {
    const input = fs.readFileSync(filePath, "utf-8").trim().split(/\s+/);

    let idx = 0;
    if (input[idx++] !== "P3") {
      throw new Error("Invalid PPM file: Missing P3 header");
    }

    const width = parseInt(input[idx++]!, 10);
    const height = parseInt(input[idx++]!, 10);
    const maxVal = parseInt(input[idx++]!, 10);
    if (maxVal !== 255) throw new Error("Invalid max color value, must be 255");

    const image = new Image(width, height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const r = parseInt(input[idx++]!, 10);
        const g = parseInt(input[idx++]!, 10);
        const b = parseInt(input[idx++]!, 10);
        image.set(x, y, new Color(r, g, b));
      }
    }
    return image;
  }

  private write(image: Image, filePath: string): void {
    let output = "";
    output += "P3\n";
    output += `${image.getWidth()} ${image.getHeight()}\n`;
    output += "255\n";

    for (let y = 0; y < image.getHeight(); y++) {
      const row: string[] = [];
      for (let x = 0; x < image.getWidth(); x++) {
        const c = image.get(x, y);
        row.push(`${c.red} ${c.green} ${c.blue}`);
      }
      output += row.join(" ") + "\n";
    }
    fs.writeFileSync(filePath, output, "utf-8");
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  new ImageEditor().run(args);
}
