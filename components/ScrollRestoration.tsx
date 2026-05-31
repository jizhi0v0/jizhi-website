"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const STORAGE_PREFIX = "jizhi:scroll:";
const MAX_ENTRY_AGE = 30 * 60 * 1000;

interface SavedScroll {
  x: number;
  y: number;
  t: number;
}

function storageKey() {
  return `${STORAGE_PREFIX}${window.location.pathname}${window.location.search}`;
}

function readSavedScroll(key: string): SavedScroll | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedScroll>;
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.t !== "number" ||
      Date.now() - parsed.t > MAX_ENTRY_AGE
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return { x: parsed.x, y: parsed.y, t: parsed.t };
  } catch {
    return null;
  }
}

function writeSavedScroll(key: string) {
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        x: window.scrollX,
        y: window.scrollY,
        t: Date.now(),
      } satisfies SavedScroll),
    );
  } catch {
    // sessionStorage can be unavailable in private or locked-down contexts.
  }
}

function navigationType() {
  const entry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return entry?.type;
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForStableArticle() {
  if (document.readyState !== "complete") {
    await new Promise<void>((resolve) => {
      window.addEventListener("load", () => resolve(), { once: true });
    });
  }

  const fontsReady = document.fonts?.ready.catch(() => undefined);
  if (fontsReady) await fontsReady;

  const pendingImages = Array.from(
    document.querySelectorAll<HTMLImageElement>(".post-body img"),
  ).filter((img) => !img.complete || img.naturalWidth === 0);

  await Promise.all(
    pendingImages.map((img) => {
      if (typeof img.decode === "function") {
        return img.decode().catch(() => undefined);
      }
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );

  await nextFrame();
}

export function ScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const key = storageKey();
    const saved = readSavedScroll(key);
    const navType = navigationType();
    let restoring =
      !!saved && (navType === "reload" || navType === "back_forward");
    let cancelled = false;

    const save = () => {
      if (!restoring && !cancelled) writeSavedScroll(key);
    };

    const restore = async () => {
      if (!saved) return;
      await waitForStableArticle();
      if (cancelled) return;

      const maxY = Math.max(
        0,
        document.documentElement.scrollHeight -
          document.documentElement.clientHeight,
      );
      window.scrollTo(saved.x, Math.min(saved.y, maxY));
      restoring = false;
      writeSavedScroll(key);
    };

    if (restoring) {
      void restore();
    } else {
      save();
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        save();
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") save();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (!restoring) writeSavedScroll(key);
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname]);

  return null;
}
