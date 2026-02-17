import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { advanceLogoIndex } from "../utils/logoRotation";

/**
 * LogoRouteListener component - advances logo on route changes
 * Should be rendered inside Router but outside Routes
 */
const LogoRouteListener = () => {
  const location = useLocation();
  const previousPathnameRef = useRef(location.pathname);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    // Skip on initial mount (page load/refresh)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousPathnameRef.current = location.pathname;
      return;
    }

    // Only advance if pathname actually changed (navigation, not refresh)
    if (previousPathnameRef.current !== location.pathname) {
      advanceLogoIndex();
      previousPathnameRef.current = location.pathname;
    }
  }, [location.pathname]);

  // This component doesn't render anything
  return null;
};

export default LogoRouteListener;

