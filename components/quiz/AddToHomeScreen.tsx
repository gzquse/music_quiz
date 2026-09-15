"use client";

import { useEffect, useState } from "react";

export function AddToHomeScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem("hide-ios-install") === "1";
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setShow(ios && !standalone && !dismissed);
  }, []);

  if (!show) return null;

  return (
    <div className="mt-6 rounded-[24px] bg-white px-4 py-4 text-left shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-[#2b221c]">Add this as an iPhone app</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6a5348]">
            Tap the Share button, then <span className="font-semibold">Add to Home Screen</span>.
            It opens like a regular app, without Safari.
          </p>
        </div>
        <button
          type="button"
          className="min-h-8 min-w-8 text-[20px] leading-none text-[#8a7a72]"
          onClick={() => {
            window.localStorage.setItem("hide-ios-install", "1");
            setShow(false);
          }}
          aria-label="Dismiss"
        >
          x
        </button>
      </div>
    </div>
  );
}
