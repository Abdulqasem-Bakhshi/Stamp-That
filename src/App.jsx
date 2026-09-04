import { useEffect, useRef, useState } from "react";
import LogoOverlay from "./LogoOverlay";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import Logo from "./assets/512x512.svg";
import "./App.css";

const PYTHON_API_URL = "http://127.0.0.1:5000";

function App() {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [logo, setLogo] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [stampedImage, setStampedImage] = useState(null);
  const [isStamping, setIsStamping] = useState(false);
  const [backendReady, setBackendReady] = useState(false);
  const [error, setError] = useState("");

  const imageContainerRef = useRef(null);
  const logoRef = useRef(null);

  const [logoSettings, setLogoSettings] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    aspectRatio: 1,
    aspectRatioLocked: true,
    opacity: 1,
  });

  function centerLogoHorizontally() {
    const container = imageContainerRef.current;

    if (!container) {
      return;
    }

    const imageWidth = container.clientWidth;

    setLogoSettings((current) => ({
      ...current,
      x: (imageWidth - current.width) / 2,
    }));
  }

  function centerLogoVertically() {
    const container = imageContainerRef.current;

    if (!container) {
      return;
    }

    const imageHeight = container.clientHeight;

    setLogoSettings((current) => ({
      ...current,
      y: (imageHeight - current.height) / 2,
    }));
  }

  useEffect(() => {
    let cancelled = false;
    let sidecarProcess = null;

    async function waitForBackend() {
      for (let attempt = 0; attempt < 20; attempt++) {
        if (cancelled) {
          return false;
        }

        try {
          const response = await fetch(`${PYTHON_API_URL}/api/health`);

          if (response.ok) {
            setBackendReady(true);
            console.log("StampThat! Python backend is ready.");
            return true;
          }
        } catch {
          // Backend is not ready yet.
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      if (!cancelled) {
        setError("Image processing engine did not start.");
      }

      return false;
    }

    async function startBackend() {
      try {
        const sidecar = await Command.sidecar("binaries/StampThat!Backend");

        if (cancelled) {
          return;
        }

        const process = await sidecar.spawn();

        if (cancelled) {
          await process.kill();
          return;
        }

        sidecarProcess = process;

        console.log("StampThat! Python backend started.");

        await waitForBackend();
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to start StampThat! Python backend:", error);
          setError("Could not start the image processing engine.");
        }
      }
    }

    startBackend();

    return () => {
      cancelled = true;

      if (sidecarProcess) {
        sidecarProcess.kill().catch((error) => {
          console.error("Failed to stop StampThat! Python backend:", error);
        });

        sidecarProcess = null;
      }
    };
  }, []);

  function handleImageChange(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setImageFile(file);
    setImage(URL.createObjectURL(file));
    setStampedImage(null);
    setError("");
  }

  function handleLogoChange(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setLogoFile(file);
    setLogo(URL.createObjectURL(file));
    setStampedImage(null);
    setError("");
  }

  function positionLogoBottomRight() {
    const container = imageContainerRef.current;
    const logoElement = logoRef.current;

    if (!container || !logoElement) {
      return;
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const logoWidth = logoElement.naturalWidth;
    const logoHeight = logoElement.naturalHeight;

    if (!logoWidth || !logoHeight) {
      return;
    }

    const width = containerWidth * 0.08;
    const height = width * (logoHeight / logoWidth);

    const margin = Math.max(containerWidth * 0.03, 20);

    const x = containerWidth - width - margin;
    const y = containerHeight - height - margin;

    setLogoSettings((current) => ({
      ...current,
      x,
      y,
      width,
      height,
      aspectRatio: logoWidth / logoHeight,
      aspectRatioLocked: true,
    }));
  }

  function handleLogoLoad() {
    positionLogoBottomRight();
  }

  function handleLogoMouseDown(event) {
    event.preventDefault();

    const container = imageContainerRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();

    const startMouseX = event.clientX;
    const startMouseY = event.clientY;

    const startX = logoSettings.x;
    const startY = logoSettings.y;

    function handleMouseMove(event) {
      const deltaX = event.clientX - startMouseX;
      const deltaY = event.clientY - startMouseY;

      const maxX = containerRect.width - logoSettings.width;
      const maxY = containerRect.height - logoSettings.height;

      let newX = startX + deltaX;
      let newY = startY + deltaY;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      setLogoSettings((current) => ({
        ...current,
        x: newX,
        y: newY,
      }));
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  function handleWidthChange(event) {
    const value = Number(event.target.value);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    const container = imageContainerRef.current;

    if (!container) {
      return;
    }

    const imageWidth = container.clientWidth;
    const imageHeight = container.clientHeight;

    setLogoSettings((current) => {
      let width = value;
      let height = current.aspectRatioLocked
        ? width / current.aspectRatio
        : current.height;

      if (width > imageWidth) {
        width = imageWidth;

        if (current.aspectRatioLocked) {
          height = width / current.aspectRatio;
        }
      }

      if (height > imageHeight) {
        height = imageHeight;

        if (current.aspectRatioLocked) {
          width = height * current.aspectRatio;
        }
      }

      const maxX = imageWidth - width;
      const maxY = imageHeight - height;

      return {
        ...current,
        width,
        height,
        x: Math.min(current.x, maxX),
        y: Math.min(current.y, maxY),
      };
    });
  }

  function handleHeightChange(event) {
    const value = Number(event.target.value);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    const container = imageContainerRef.current;

    if (!container) {
      return;
    }

    const imageWidth = container.clientWidth;
    const imageHeight = container.clientHeight;

    setLogoSettings((current) => {
      let width = current.width;
      let height = value;

      if (current.aspectRatioLocked) {
        width = height * current.aspectRatio;
      }

      if (width > imageWidth) {
        width = imageWidth;

        if (current.aspectRatioLocked) {
          height = width / current.aspectRatio;
        }
      }

      if (height > imageHeight) {
        height = imageHeight;

        if (current.aspectRatioLocked) {
          width = height * current.aspectRatio;
        }
      }

      const maxX = imageWidth - width;
      const maxY = imageHeight - height;

      return {
        ...current,
        width,
        height,
        x: Math.min(current.x, maxX),
        y: Math.min(current.y, maxY),
      };
    });
  }

  function handleAspectRatioChange(event) {
    setLogoSettings((current) => ({
      ...current,
      aspectRatioLocked: event.target.checked,
    }));
  }

  async function handleStamp() {
    if (!imageFile || !logoFile || !imageContainerRef.current) {
      return;
    }

    setIsStamping(true);
    setError("");

    try {
      const container = imageContainerRef.current;

      // Get the actual original image dimensions.
      // Python will process the original file itself.
      const imageBitmap = await createImageBitmap(imageFile, {
        imageOrientation: "from-image",
      });

      const originalWidth = imageBitmap.width;
      const originalHeight = imageBitmap.height;

      imageBitmap.close();

      const displayWidth = container.clientWidth;
      const displayHeight = container.clientHeight;

      if (!displayWidth || !displayHeight) {
        throw new Error("Could not determine the displayed image size.");
      }

      // Convert editor coordinates to original-image coordinates.
      const scaleX = originalWidth / displayWidth;
      const scaleY = originalHeight / displayHeight;

      const logoX = Math.round(logoSettings.x * scaleX);
      const logoY = Math.round(logoSettings.y * scaleY);
      const logoWidth = Math.round(logoSettings.width * scaleX);

      // The Python stamping engine uses the SVG's real aspect ratio.
      // Width is the authoritative output size.
      if (logoWidth <= 0) {
        throw new Error("Logo width must be greater than zero.");
      }

      const formData = new FormData();

      formData.append("image", imageFile);
      formData.append("logo", logoFile);
      formData.append("x", String(logoX));
      formData.append("y", String(logoY));
      formData.append("width", String(logoWidth));
      formData.append("opacity", String(logoSettings.opacity));
      formData.append("format", "png");

      const response = await fetch(`${PYTHON_API_URL}/api/stamp`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Python stamping server returned an error.";

        try {
          const data = await response.json();

          if (data.error) {
            message = data.error;
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("Python returned an empty image.");
      }

      // Display the actual image produced by Python.
      const outputUrl = URL.createObjectURL(blob);

      setStampedImage((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return outputUrl;
      });
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while stamping the image.",
      );
    } finally {
      setIsStamping(false);
    }
  }

  async function handleDownload() {
    if (!stampedImage) {
      return;
    }

    const filePath = await save({
      defaultPath: "stamped-image.png",
      filters: [
        {
          name: "PNG Image",
          extensions: ["png"],
        },
      ],
    });

    if (!filePath) {
      return;
    }

    const response = await fetch(stampedImage);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    await writeFile(filePath, bytes);
  }

  return (
    <div className="app">
      <header className="toolbar">
        <title>StampThat!</title>
        <img id="logo" src={Logo} alt="StampThat! Logo" />
        <div className="controls">
          <label className="file-button">
            Choose Image
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </label>

          <label className="file-button">
            Choose Logo
            <input
              type="file"
              accept="image/svg+xml"
              onChange={handleLogoChange}
            />
          </label>

          {image && logo && (
            <button
              type="button"
              className="stamp-button"
              onClick={handleStamp}
              disabled={isStamping}
            >
              {isStamping ? "Stamping..." : "Stamp"}
            </button>
          )}

          {stampedImage && (
            <button
              type="button"
              className="stamp-button"
              onClick={handleDownload}
            >
              Download
            </button>
          )}
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <main className="workspace">
        <div className="editor">
          {stampedImage ? (
            <div className="image-container">
              <img
                src={stampedImage}
                alt="Stamped result"
                className="main-image"
              />
            </div>
          ) : image ? (
            <div className="image-container" ref={imageContainerRef}>
              <img src={image} alt="Selected" className="main-image" />

              {logo && (
                <LogoOverlay
                  logo={logo}
                  logoRef={logoRef}
                  logoSettings={logoSettings}
                  handleLogoLoad={handleLogoLoad}
                  handleLogoMouseDown={handleLogoMouseDown}
                />
              )}
            </div>
          ) : (
            <div className="empty-state">
              <p>Choose an image to get started</p>
            </div>
          )}
        </div>

        {logo && !stampedImage && (
          <aside className="properties-panel">
            <h2>Logo</h2>

            <div className="property-group">
              <label>
                Width
                <input
                  type="number"
                  min="1"
                  value={Math.round(logoSettings.width)}
                  onChange={handleWidthChange}
                />
              </label>

              <label>
                Height
                <input
                  type="number"
                  min="1"
                  value={Math.round(logoSettings.height)}
                  onChange={handleHeightChange}
                />
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={logoSettings.aspectRatioLocked}
                  onChange={handleAspectRatioChange}
                />
                Lock aspect ratio
              </label>

              <label className="opacity-control">
                <span>Opacity</span>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={logoSettings.opacity}
                  onChange={(event) => {
                    setLogoSettings((current) => ({
                      ...current,
                      opacity: Number(event.target.value),
                    }));
                  }}
                />

                <input
                  className="opacity-value"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={logoSettings.opacity.toFixed(2)}
                  onChange={(event) => {
                    const value = Number(event.target.value);

                    if (!Number.isFinite(value)) {
                      return;
                    }

                    setLogoSettings((current) => ({
                      ...current,
                      opacity: Math.max(0, Math.min(1, value)),
                    }));
                  }}
                />
              </label>
            </div>

            <h2>Position</h2>

            <div className="property-group">
              <label>
                X
                <input
                  type="number"
                  value={Math.round(logoSettings.x)}
                  onChange={(event) => {
                    const value = Number(event.target.value);

                    if (!Number.isFinite(value)) {
                      return;
                    }

                    const imageWidth =
                      imageContainerRef.current?.clientWidth ?? 0;

                    const maxX = imageWidth - logoSettings.width;

                    setLogoSettings((current) => ({
                      ...current,
                      x: Math.max(0, Math.min(value, maxX)),
                    }));
                  }}
                />
              </label>

              <label>
                Y
                <input
                  type="number"
                  value={Math.round(logoSettings.y)}
                  onChange={(event) => {
                    const value = Number(event.target.value);

                    if (!Number.isFinite(value)) {
                      return;
                    }

                    const imageHeight =
                      imageContainerRef.current?.clientHeight ?? 0;

                    const maxY = imageHeight - logoSettings.height;

                    setLogoSettings((current) => ({
                      ...current,
                      y: Math.max(0, Math.min(value, maxY)),
                    }));
                  }}
                />
              </label>

              <button type="button" onClick={centerLogoHorizontally}>
                Center Horizontally
              </button>

              <button type="button" onClick={centerLogoVertically}>
                Center Vertically
              </button>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}

export default App;
