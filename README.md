# StampThat!!

StampThat!! is a desktop application for adding a logo or watermark to images.

It provides a simple graphical interface for positioning, resizing, centering, and adjusting the opacity of a logo before stamping it onto an image.

The application is built with React and Tauri, while the image-processing engine remains Python-based.

## Features

- Add a logo or watermark to an image
- Drag and position the logo
- Resize the logo
- Lock or unlock the logo aspect ratio
- Adjust logo opacity
- Center the logo horizontally
- Center the logo vertically
- Preview the result before saving
- Supports PNG, JPEG, and WebP image processing
- Windows desktop application
- Python image-processing backend
- Tauri sidecar architecture
- Open-source

## Screenshots

> Screenshots coming soon.

## Tech Stack

### Frontend

- React
- Vite
- JavaScript

### Desktop Application

- Tauri v2

### Image Processing

- Python
- Flask
- Pillow
- resvg

### Python Packaging

- PyInstaller

## Architecture

StampThat! keeps the image-processing logic in Python rather than reimplementing it in JavaScript.

```text
┌─────────────────────┐
│      React UI       │
│                     │
│  Image / Logo / UI  │
└──────────┬──────────┘
           │
           │ HTTP
           ▼
┌─────────────────────┐
│    Flask Backend    │
│   127.0.0.1:5000   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Python Processor  │
│                     │
│    Pillow / resvg   │
└─────────────────────┘
