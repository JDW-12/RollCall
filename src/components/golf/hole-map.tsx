"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MlMap, Marker, GeoJSONSource } from "maplibre-gl";
import type { HoleGeo } from "@/domain/course-geo";
import { bearing, distance, toYards, type LatLon } from "@/domain/geo";

/**
 * The hole on satellite imagery, turned so it plays up the screen like a yardage book: tee at the
 * bottom, green at the top. Your dot moves with the GPS; tap anywhere to drop a target and read the
 * carry to it and what's left from it to the middle of the green.
 *
 * MapLibre (open source) draws MapTiler's satellite tiles. The library loads only on this page.
 */

type Props = { mapKey: string; hole: HoleGeo | null; center: LatLon | null; me: LatLon | null; target: LatLon | null; onTarget: (p: LatLon | null) => void };

const ll = (p: LatLon): [number, number] => [p[1], p[0]];
const line = (coords: LatLon[]) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: coords.map(ll) } });
const empty = { type: "FeatureCollection" as const, features: [] };

function dot(cls: string, label?: string): HTMLElement {
  const el = document.createElement("div");
  el.className = cls;
  if (label) el.dataset.label = label;
  return el;
}

export function HoleMap({ mapKey, hole, center, me, target, onTarget }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const marks = useRef<{ me?: Marker; flag?: Marker; target?: Marker; tee?: Marker }>({});
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const tap = useRef(onTarget);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    tap.current = onTarget;
  }, [onTarget]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !box.current) return;
      lib.current = ml;
      const start = hole?.green.center ?? center ?? me ?? [51.5, -0.12];
      const m = new ml.Map({
        container: box.current,
        style: {
          version: 8,
          sources: {
            sat: {
              type: "raster",
              tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${mapKey}`],
              tileSize: 512,
              maxzoom: 20,
              attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap contributors</a>',
            },
          },
          layers: [{ id: "sat", type: "raster", source: "sat" }],
        },
        center: ll(start as LatLon),
        zoom: 16,
        attributionControl: { compact: true },
        pitchWithRotate: false,
      });
      m.touchZoomRotate.disableRotation();
      m.dragRotate.disable();
      m.on("load", () => {
        m.addSource("hole", { type: "geojson", data: empty });
        m.addSource("green", { type: "geojson", data: empty });
        m.addSource("aim", { type: "geojson", data: empty });
        m.addLayer({ id: "hole", type: "line", source: "hole", paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0.55, "line-dasharray": [2, 2] } });
        m.addLayer({ id: "green", type: "line", source: "green", paint: { "line-color": "#d9f99d", "line-width": 2, "line-opacity": 0.9 } });
        m.addLayer({ id: "aim", type: "line", source: "aim", paint: { "line-color": "#facc15", "line-width": 2.5 } });
        // The credit stays one tap away (the "i") rather than spread across the bottom of a small screen.
        box.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        setReady(true);
      });
      m.on("click", (e) => tap.current([e.lngLat.lat, e.lngLat.lng]));
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // The map is built once; later props are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapKey]);

  // Frame the hole: tee to green, turned so it plays up the screen.
  useEffect(() => {
    const m = map.current;
    const ml = lib.current;
    if (!ready || !m || !ml) return;
    (m.getSource("hole") as GeoJSONSource).setData(hole ? line(hole.line) : empty);
    (m.getSource("green") as GeoJSONSource).setData(hole?.green.outline ? line(hole.green.outline) : empty);
    marks.current.flag?.remove();
    marks.current.tee?.remove();
    if (!hole) {
      if (center ?? me) m.jumpTo({ center: ll((me ?? center)!), zoom: 16.5, bearing: 0 });
      return;
    }
    marks.current.flag = new ml.Marker({ element: dot("hm-flag"), anchor: "bottom-left" }).setLngLat(ll(hole.green.center)).addTo(m);
    marks.current.tee = new ml.Marker({ element: dot("hm-tee") }).setLngLat(ll(hole.tee)).addTo(m);
    const pts = [hole.tee, hole.green.center, ...(hole.green.outline ?? [])];
    const bounds = new ml.LngLatBounds(ll(pts[0]), ll(pts[0]));
    for (const p of pts) bounds.extend(ll(p));
    // Room at the top for the yardage boxes that sit over the map, and at the bottom for the GPS line.
    m.fitBounds(bounds, { bearing: bearing(hole.tee, hole.green.center), padding: { top: 120, bottom: 60, left: 40, right: 40 }, maxZoom: 18.5, duration: 700 });
  }, [ready, hole, center, me === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // You, as the GPS moves.
  useEffect(() => {
    const m = map.current;
    const ml = lib.current;
    if (!ready || !m || !ml) return;
    if (!me) {
      marks.current.me?.remove();
      marks.current.me = undefined;
      return;
    }
    if (!marks.current.me) marks.current.me = new ml.Marker({ element: dot("hm-me") }).setLngLat(ll(me)).addTo(m);
    else marks.current.me.setLngLat(ll(me));
  }, [ready, me]);

  // The tapped target: carry from you, then what's left to the middle of the green.
  useEffect(() => {
    const m = map.current;
    const ml = lib.current;
    if (!ready || !m || !ml) return;
    marks.current.target?.remove();
    marks.current.target = undefined;
    if (!target) {
      (m.getSource("aim") as GeoJSONSource).setData(empty);
      return;
    }
    const from = me ?? hole?.tee ?? null;
    const parts = [from ? `${toYards(distance(from, target))}` : null, hole ? `${toYards(distance(target, hole.green.center))} left` : null].filter(Boolean).join(" · ");
    marks.current.target = new ml.Marker({ element: dot("hm-target", parts) }).setLngLat(ll(target)).addTo(m);
    (m.getSource("aim") as GeoJSONSource).setData(line([...(from ? [from] : []), target, ...(hole ? [hole.green.center] : [])]));
  }, [ready, target, me, hole]);

  // MapLibre's stylesheet sets its container to position: relative, so the map fills a positioned wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={box} className="w-full h-full" role="application" aria-label="Satellite map of the hole. Tap to measure to a spot." />
    </div>
  );
}
