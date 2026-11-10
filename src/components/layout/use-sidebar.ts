"use client";

import {
  useCallback,
  useEffect,
  useSyncExternalStore,
  type KeyboardEvent,
  type RefObject,
} from "react";

/* ---------------------------------------------------------------------------------------------
   Collapsed or expanded sidebar, remembered per browser (localStorage). Read through
   useSyncExternalStore so the server render (always expanded) and the browser agree during
   hydration, and every open tab follows the same choice.
   --------------------------------------------------------------------------------------------- */

const STORAGE_KEY = "gis-hub.sidebar.collapsed";
const CHANGE_EVENT = "gis-hub:sidebar";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false; // storage blocked (private mode, policy): fall back to expanded
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useSidebarCollapsed(): [boolean, (next: boolean) => void] {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const setCollapsed = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // not remembered, but the toggle still works for this page view
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [collapsed, setCollapsed];
}

/* ---------------------------------------------------------------------------------------------
   Dock magnification (vertical, macOS dock style). The icon nearest the pointer grows to
   MAX_SCALE and its neighbours grow less with distance. Only CSS transforms are written, straight
   to the DOM inside one animation frame, so rows keep their height and nothing reflows or
   re-renders. Off for touch and pen input, for devices without a fine hovering pointer and when
   the user asks for reduced motion.
   --------------------------------------------------------------------------------------------- */

const MAX_SCALE = 1.5;
/** Distance in pixels at which an icon is back to its normal size. */
const RANGE = 110;
/** How far a label moves right (px) when its icon is at full size, in the expanded state. */
const LABEL_SHIFT = 10;
const MOTION_OK = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/** Scale for an icon whose row centre is `distance` px from the pointer (cosine fall-off). */
export function dockScale(distance: number): number {
  const d = Math.min(Math.abs(distance), RANGE) / RANGE;
  return 1 + (MAX_SCALE - 1) * ((Math.cos(Math.PI * d) + 1) / 2);
}

export function useDockMagnify(rootRef: RefObject<HTMLElement | null>, shiftLabels: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window.matchMedia !== "function") return;
    const motion = window.matchMedia(MOTION_OK);
    let frame = 0;
    let pointerY: number | null = null;

    const rows = () => Array.from(root.querySelectorAll<HTMLElement>("[data-dock-row]"));

    const reset = () => {
      for (const row of rows()) {
        row.querySelector<HTMLElement>("[data-dock-icon]")?.style.removeProperty("transform");
        row.querySelector<HTMLElement>("[data-dock-label]")?.style.removeProperty("transform");
      }
    };

    const apply = () => {
      frame = 0;
      if (pointerY === null) return reset();
      for (const row of rows()) {
        // The row itself is never transformed, so its box is a stable reference.
        const box = row.getBoundingClientRect();
        const scale = dockScale(pointerY - (box.top + box.height / 2));
        const icon = row.querySelector<HTMLElement>("[data-dock-icon]");
        const label = row.querySelector<HTMLElement>("[data-dock-label]");
        if (icon) icon.style.transform = scale > 1.001 ? `scale(${scale.toFixed(3)})` : "";
        if (label)
          label.style.transform =
            shiftLabels && scale > 1.001
              ? `translateX(${((scale - 1) * 2 * LABEL_SHIFT).toFixed(1)}px)`
              : "";
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !motion.matches) return;
      pointerY = e.clientY;
      schedule();
    };
    const onLeave = () => {
      pointerY = null;
      schedule();
    };
    const onMotionChange = () => {
      if (!motion.matches) onLeave();
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("scroll", onLeave, { passive: true });
    motion.addEventListener("change", onMotionChange);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("scroll", onLeave);
      motion.removeEventListener("change", onMotionChange);
      if (frame) window.cancelAnimationFrame(frame);
      reset();
    };
  }, [rootRef, shiftLabels]);
}

/**
 * Arrow keys move between the navigation links (Up, Down, Home, End), on top of the normal Tab
 * order, so a keyboard user can walk a long menu quickly.
 */
export function navArrowKeys(e: KeyboardEvent<HTMLElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
  const links = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("a[data-dock-row]"));
  const at = links.indexOf(document.activeElement as HTMLElement);
  if (at === -1) return;
  e.preventDefault();
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? links.length - 1
        : (at + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
  links[next]?.focus();
}
