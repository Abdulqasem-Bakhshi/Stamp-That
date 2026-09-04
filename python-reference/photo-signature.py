from pathlib import Path
from io import BytesIO

import resvg_py
from PIL import Image, ImageOps


# ============================================================
# CONFIGURATION
# ============================================================

# Automatically find the project root:
# EmbassyAfghanWarsaw/
PROJECT_ROOT = Path(__file__).resolve().parents[2]

INPUT_FOLDER = PROJECT_ROOT / "assets" / "input"

OUTPUT_FOLDER = PROJECT_ROOT / "assets" / "output"

LOGO_PATH = PROJECT_ROOT / "assets" / "input" / "input.svg"


# Logo size as a percentage of image width
LOGO_WIDTH_PERCENT = 0.10

# Logo size limits in pixels
MIN_LOGO_WIDTH = 250
MAX_LOGO_WIDTH = 1000

# Distance from right/bottom edge as percentage of image width
MARGIN_PERCENT = 0.03

# Image quality when saving JPEGs
JPEG_QUALITY = 95

# Supported image formats
SUPPORTED_FORMATS = {".jpg", ".jpeg", ".png", ".webp"}


# ============================================================
# SETUP
# ============================================================

OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)


# ============================================================
# LOAD LOGO
# ============================================================

if not LOGO_PATH.exists():
    raise FileNotFoundError(
        f"Logo not found:\n{LOGO_PATH}"
    )

# Render SVG directly to PNG bytes
png_data = resvg_py.svg_to_bytes(
    svg_path=str(LOGO_PATH),
    width=2000
)

# Load rendered PNG into Pillow
logo_original = Image.open(
    BytesIO(png_data)
).convert("RGBA")


# ============================================================
# PROCESS ONE IMAGE
# ============================================================

def add_logo(image_path: Path, output_path: Path):
    print(f"Processing: {image_path.name}")

    # Open image
    image = Image.open(image_path)

    # Correct orientation based on EXIF metadata
    image = ImageOps.exif_transpose(image)

    # Convert to RGBA so transparency works correctly
    image = image.convert("RGBA")

    # --------------------------------------------------------
    # Calculate logo size
    # --------------------------------------------------------

    logo_width = int(image.width * LOGO_WIDTH_PERCENT)

    # Apply minimum/maximum limits
    logo_width = max(logo_width, MIN_LOGO_WIDTH)
    logo_width = min(logo_width, MAX_LOGO_WIDTH)

    # Preserve logo aspect ratio
    logo_height = int(
        logo_original.height *
        (logo_width / logo_original.width)
    )

    logo = logo_original.resize(
        (logo_width, logo_height),
        Image.Resampling.LANCZOS
    )

    # --------------------------------------------------------
    # Calculate margin
    # --------------------------------------------------------

    margin = int(image.width * MARGIN_PERCENT)

    # Prevent extremely small margins
    margin = max(margin, 20)

    # --------------------------------------------------------
    # Calculate bottom-right position
    # --------------------------------------------------------

    x = image.width - logo.width - margin
    y = image.height - logo.height - margin

    # --------------------------------------------------------
    # Place logo
    # --------------------------------------------------------

    image.alpha_composite(logo, (x, y))

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    suffix = output_path.suffix.lower()

    if suffix in {".jpg", ".jpeg"}:

        # JPEG doesn't support transparency
        image = image.convert("RGB")

        image.save(
            output_path,
            "JPEG",
            quality=JPEG_QUALITY,
            optimize=True
        )

    elif suffix == ".png":

        image.save(
            output_path,
            "PNG",
            optimize=True
        )

    elif suffix == ".webp":

        image.save(
            output_path,
            "WEBP",
            quality=JPEG_QUALITY,
            method=6
        )

    print(f"  → Saved: {output_path.name}")


# ============================================================
# PROCESS ENTIRE FOLDER
# ============================================================

def process_folder():

    if not INPUT_FOLDER.exists():
        raise FileNotFoundError(
            f"Input folder not found:\n{INPUT_FOLDER}"
        )

    # Find images
    images = [
        file
        for file in INPUT_FOLDER.iterdir()
        if file.is_file()
        and file.suffix.lower() in SUPPORTED_FORMATS
    ]

    if not images:
        print("No supported images found.")
        return

    print()
    print("=" * 60)
    print("EMBASSY IMAGE BRANDING")
    print("=" * 60)
    print(f"Input : {INPUT_FOLDER}")
    print(f"Output: {OUTPUT_FOLDER}")
    print(f"Logo  : {LOGO_PATH}")
    print(f"Images: {len(images)}")
    print("=" * 60)
    print()

    successful = 0
    failed = 0

    for image_path in images:

        # Keep original filename
        output_path = OUTPUT_FOLDER / image_path.name

        try:
            add_logo(image_path, output_path)
            successful += 1

        except Exception as error:

            failed += 1

            print(
                f"  ERROR processing {image_path.name}: "
                f"{error}"
            )

    print()
    print("=" * 60)
    print("COMPLETE")
    print("=" * 60)
    print(f"Successfully processed: {successful}")
    print(f"Failed:                 {failed}")
    print(f"Output folder:          {OUTPUT_FOLDER}")
    print("=" * 60)


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    process_folder()