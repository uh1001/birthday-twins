import { geoEqualEarth, geoPath } from "d3-geo";
import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { countryByCode } from "@/lib/countries";
import { flagFor } from "@/lib/birthday";

const W = 800;
const H = 400;

export type MapPoint = { country: string; code: string; count: number };

export function WorldMap({ points, selected, onSelect }: { points: MapPoint[]; selected: string | null; onSelect: (country: string | null) => void }) {
  const [land, setLand] = useState<FeatureCollection<Geometry> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then((topo: Topology) => {
        if (alive) setLand(feature(topo, topo.objects["countries"]!) as unknown as FeatureCollection<Geometry>);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const projection = useMemo(() => geoEqualEarth().scale(150).translate([W / 2, H / 2 + 10]), []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const max = Math.max(1, ...points.map((p) => p.count));

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Map of where your Birthday Twins live">
        {land?.features.map((f, i) => (
          <path key={i} d={path(f) ?? undefined} className="fill-border stroke-background" strokeWidth={0.5} />
        ))}
        {points.map((p) => {
          const c = countryByCode(p.code);
          if (!c) return null;
          const xy = projection([c.lng, c.lat]);
          if (!xy) return null;
          const r = 5 + (p.count / max) * 14;
          const active = selected === p.country;
          return (
            <g key={p.country} onClick={() => onSelect(active ? null : p.country)} className="cursor-pointer">
              <circle cx={xy[0]} cy={xy[1]} r={r} className={active ? "fill-primary" : "fill-primary/50 hover:fill-primary/80"} />
              <title>{`${p.country}: ${p.count}`}</title>
              {r > 10 && <text x={xy[0]} y={xy[1] + 4} textAnchor="middle" className="pointer-events-none fill-primary-foreground text-[10px] font-semibold">{p.count}</text>}
            </g>
          );
        })}
      </svg>
      {failed && <p className="absolute inset-x-0 top-2 text-center text-xs text-muted-foreground">Map outlines unavailable — tap a country below.</p>}
      <p className="sr-only">{points.map((p) => `${flagFor(p.code)} ${p.country} ${p.count}`).join(", ")}</p>
    </div>
  );
}
