from io import BytesIO

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

from stamp import stamp_image


app = Flask(__name__)
CORS(app)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/stamp")
def stamp():
    image_file = request.files.get("image")
    logo_file = request.files.get("logo")

    if image_file is None:
        return jsonify({"error": "Image file is required."}), 400

    if logo_file is None:
        return jsonify({"error": "Logo file is required."}), 400

    try:
        logo_x = int(request.form.get("x", "0"))
        logo_y = int(request.form.get("y", "0"))
        logo_width = int(request.form.get("width", "0"))
        logo_opacity = float(request.form.get("opacity", "1"))
        output_format = request.form.get("format", "png").lower()

        if logo_width <= 0:
            raise ValueError("Logo width must be greater than zero.")

        image_bytes = image_file.read()
        svg_bytes = logo_file.read()

        output_bytes = stamp_image(
            image_bytes=image_bytes,
            svg_bytes=svg_bytes,
            logo_x=logo_x,
            logo_y=logo_y,
            logo_width=logo_width,
            logo_opacity=logo_opacity,
            output_format=output_format,
        )

        mimetypes = {
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "webp": "image/webp",
        }

        if output_format not in mimetypes:
            raise ValueError(
                f"Unsupported output format: {output_format}"
            )

        extension = (
            "jpg"
            if output_format in {"jpg", "jpeg"}
            else output_format
        )

        return send_file(
            BytesIO(output_bytes),
            mimetype=mimetypes[output_format],
            as_attachment=False,
            download_name=f"stamped-image.{extension}",
        )

    except Exception as error:
        return jsonify({"error": str(error)}), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
    )
