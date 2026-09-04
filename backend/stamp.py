from io import BytesIO

import resvg_py
from PIL import Image, ImageOps


JPEG_QUALITY = 95


def stamp_image(
    image_bytes: bytes,
    svg_bytes: bytes,
    logo_x: int,
    logo_y: int,
    logo_width: int,
    logo_opacity=1,
    output_format: str = "png",
) -> bytes:
    """
    Python stamping engine based directly on the original StampThat!
    Pillow + resvg_py script.

    The SVG is rasterized by resvg_py before Pillow composites it onto
    the original-resolution image. The SVG is never obtained from the
    browser preview.
    """

    # --------------------------------------------------------
    # Open image
    # --------------------------------------------------------

    image = Image.open(BytesIO(image_bytes))

    # Correct orientation based on EXIF metadata
    image = ImageOps.exif_transpose(image)

    # Convert to RGBA so transparency works correctly
    image = image.convert("RGBA")

    # --------------------------------------------------------
    # Render SVG
    # --------------------------------------------------------

    # Use a temporary SVG file because this matches the original
    # script's resvg_py.svg_to_bytes(svg_path=...) API.
    import tempfile

    with tempfile.NamedTemporaryFile(
        suffix=".svg",
        delete=True,
    ) as svg_file:
        svg_file.write(svg_bytes)
        svg_file.flush()

        # Never rasterize below the requested final logo width.
        # The original script used 2000px; retaining that as the
        # minimum gives the same high-resolution behavior while
        # also preventing enlargement for larger requested logos.
        render_width = max(2000, int(logo_width))

        png_data = resvg_py.svg_to_bytes(
            svg_path=svg_file.name,
            width=render_width,
        )

    logo_original = Image.open(
        BytesIO(png_data)
    ).convert("RGBA")

    # --------------------------------------------------------
    # Calculate logo size
    # --------------------------------------------------------

    # Preserve the SVG's actual aspect ratio, exactly as the
    # original Python script does.
    logo_height = int(
        logo_original.height *
        (logo_width / logo_original.width)
    )

    logo = logo_original.resize(
        (int(logo_width), logo_height),
        Image.Resampling.LANCZOS,
    )

    alpha = logo.getchannel("A")
    alpha = alpha.point(lambda value: int(value * logo_opacity))
    logo.putalpha(alpha)

    # --------------------------------------------------------
    # Place logo
    # --------------------------------------------------------

    image.alpha_composite(
        logo,
        (int(logo_x), int(logo_y)),
    )

    # --------------------------------------------------------
    # Save
    # --------------------------------------------------------

    output = BytesIO()
    output_format = output_format.lower().lstrip(".")

    if output_format in {"jpg", "jpeg"}:

        image = image.convert("RGB")

        image.save(
            output,
            "JPEG",
            quality=JPEG_QUALITY,
            optimize=True,
        )

    elif output_format == "png":

        image.save(
            output,
            "PNG",
            optimize=True,
        )

    elif output_format == "webp":

        image.save(
            output,
            "WEBP",
            quality=JPEG_QUALITY,
            method=6,
        )

    else:
        raise ValueError(
            f"Unsupported output format: {output_format}"
        )

    return output.getvalue()
