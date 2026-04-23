const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sourceIcon = path.join(__dirname, "icon", "no-bg-icon.png");
const resPath = path.join(__dirname, "android", "app", "src", "main", "res");

// Icon sizes for different densities
const iconSizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

const adaptiveForegroundSizes = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

const notificationSizes = {
  mdpi: 24,
  hdpi: 36,
  xhdpi: 48,
  xxhdpi: 72,
  xxxhdpi: 96,
};

async function generateIcons() {
  console.log("Generating Android launcher icons...");

  try {
    // Generate mipmap icons
    for (const [density, size] of Object.entries(iconSizes)) {
      const outputDir = path.join(resPath, `mipmap-${density}`);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(`  Creating ${density} launcher icon (${size}x${size})...`);

      await sharp(sourceIcon)
        .resize(size, size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toFile(path.join(outputDir, "ic_launcher.png"));

      await sharp(sourceIcon)
        .resize(size, size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toFile(path.join(outputDir, "ic_launcher_round.png"));
    }

    // Generate adaptive icon foreground assets used by mipmap-anydpi-v26 XML
    for (const [density, size] of Object.entries(adaptiveForegroundSizes)) {
      const outputDir = path.join(resPath, `mipmap-${density}`);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(
        `  Creating ${density} adaptive foreground icon (${size}x${size})...`,
      );

      await sharp(sourceIcon)
        .resize(size, size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toFile(path.join(outputDir, "ic_launcher_foreground.png"));
    }

    // Generate notification icons (smaller sizes)
    for (const [density, size] of Object.entries(notificationSizes)) {
      const outputDir = path.join(resPath, `drawable-${density}`);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      console.log(
        `  Creating ${density} notification icon (${size}x${size})...`,
      );

      await sharp(sourceIcon)
        .resize(size, size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toFile(path.join(outputDir, "ic_notification.png"));
    }

    console.log("✓ Icon generation complete!");
  } catch (error) {
    console.error("Error generating icons:", error);
    process.exit(1);
  }
}

generateIcons();
