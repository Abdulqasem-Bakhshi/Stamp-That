function LogoOverlay({
  logo,
  logoRef,
  logoSettings,
  handleLogoLoad,
  handleLogoMouseDown,
}) {
  return (
    <img
      ref={logoRef}
      src={logo}
      alt="Logo"
      className="logo"
      style={{
        left: `${logoSettings.x}px`,
        top: `${logoSettings.y}px`,
        width: `${logoSettings.width}px`,
        height: `${logoSettings.height}px`,
        opacity: logoSettings.opacity,
      }}
      onLoad={handleLogoLoad}
      onMouseDown={handleLogoMouseDown}
      draggable={false}
    />
  );
}

export default LogoOverlay;
