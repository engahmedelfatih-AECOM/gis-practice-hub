"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapPoint {
  id: string;
  name: string;
  status: string;
  client: string | null;
  lat: number;
  lng: number;
  label: string | null;
}

/** Marker colour per project status: the same hues as the status cells. */
const COLOURS: Record<string, string> = {
  Progressing: "var(--earth-green)",
  "At Risk": "var(--sunrise-yellow)",
  "On Hold": "var(--black-50)",
  Completed: "var(--midnight-teal)",
  "Not Started": "var(--black)",
};

/** Built-in raster style (OpenStreetMap tiles) used when no style URL is set in Settings. */
const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/** MapLibre map of the projects register (no ArcGIS dependency). */
export function ProjectsMap({ points, center }: { points: MapPoint[]; center: { lat: number; lng: number; zoom: number; styleUrl: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: center.styleUrl || OSM_STYLE,
      center: [center.lng, center.lat],
      zoom: center.zoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const markers = points.map((p) => {
      const el = document.createElement("button");
      el.type = "button";
      el.title = p.name;
      el.setAttribute("aria-label", `${p.name} - ${p.status}`);
      el.style.cssText = `width:16px;height:16px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.3);background:${COLOURS[p.status] ?? "var(--earth-green)"};cursor:pointer`;
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<strong>${escape(p.name)}</strong><br/>${escape(p.client ?? "")}<br/>${escape(p.status)}${p.label ? `<br/>${escape(p.label)}` : ""}<br/><a href="/projects/${p.id}">Open update page</a>`,
      );
      return new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
    });
    if (points.length > 1) {
      const b = new maplibregl.LngLatBounds();
      points.forEach((p) => b.extend([p.lng, p.lat]));
      map.fitBounds(b, { padding: 60, maxZoom: 9, duration: 0 });
    }
    return () => {
      markers.forEach((m) => m.remove());
      map.remove();
    };
  }, [points, center]);
  return (
    <div className="relative">
      <div ref={ref} className="h-[28rem] w-full rounded-b-lg" />
      {points.length === 0 ? (
        <p className="bg-surface/90 absolute top-3 left-3 rounded px-3 py-1.5 text-xs text-gray-600">
          No project has a location yet. Add latitude and longitude on the project form.
        </p>
      ) : null}
    </div>
  );
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
