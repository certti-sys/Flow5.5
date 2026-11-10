import { useState, useEffect } from "react";

export type DeviceType = "mobile" | "tablet" | "desktop";

const MOBILE_BREAKPOINT = 640;  // < 640px = mobile
const TABLET_BREAKPOINT = 1024; // 640px - 1023px = tablet, >= 1024px = desktop

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    if (typeof window === "undefined") return "desktop";
    const width = window.innerWidth;
    if (width < MOBILE_BREAKPOINT) return "mobile";
    if (width < TABLET_BREAKPOINT) return "tablet";
    return "desktop";
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < MOBILE_BREAKPOINT) {
        setDeviceType("mobile");
      } else if (width < TABLET_BREAKPOINT) {
        setDeviceType("tablet");
      } else {
        setDeviceType("desktop");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return deviceType;
}
