"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SYSTEM } from "@/lib/system";
import { useLayoutStore, type PlacedBox } from "@/lib/layout-store";

interface DragState {
  originCell: { x: number; y: number };
  currentCell: { x: number; y: number };
}

/**
 * Draufsicht auf die 10×10-Grundrasterplatte mit Drag-Aufziehen zum Erzeugen
 * neuer Kästen. Nutzt SVG; kein 3D. Rasterzellen bleiben rein logisch – die
 * Rasterplatte selbst wird nicht editierbar dargestellt.
 */
export function LayoutGrid() {
  const boxes = useLayoutStore((s) => s.boxes);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const addBox = useLayoutStore((s) => s.addBox);
  const canPlace = useLayoutStore((s) => s.canPlace);
  const select = useLayoutStore((s) => s.select);
  const removeBox = useLayoutStore((s) => s.removeBox);

  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const cellPx = 40;
  const w = SYSTEM.gridColumns * cellPx;
  const h = SYSTEM.gridRows * cellPx;

  const previewRect = useMemo(() => rectFromDrag(drag), [drag]);
  const previewValid = previewRect
    ? canPlace(previewRect.x, previewRect.y, previewRect.widthCells, previewRect.depthCells)
    : false;

  function cellFromEvent(e: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    const py = ((e.clientY - rect.top) / rect.height) * h;
    const gx = Math.floor(px / cellPx);
    const gy = Math.floor(py / cellPx);
    if (gx < 0 || gy < 0 || gx >= SYSTEM.gridColumns || gy >= SYSTEM.gridRows) return null;
    return { x: gx, y: gy };
  }

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if ((ev.key === "Delete" || ev.key === "Backspace") && selectedId) {
        removeBox(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, removeBox]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full bg-neutral-900 select-none touch-none"
      onPointerDown={(e) => {
        const c = cellFromEvent(e);
        if (!c) return;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        setDrag({ originCell: c, currentCell: c });
        select(null);
      }}
      onPointerMove={(e) => {
        if (!drag) return;
        const c = cellFromEvent(e);
        if (!c) return;
        setDrag({ ...drag, currentCell: c });
      }}
      onPointerUp={() => {
        if (!drag) return;
        const r = rectFromDrag(drag);
        if (r) {
          const created = addBox(r.x, r.y, r.widthCells, r.depthCells);
          if (created) select(created.id);
        }
        setDrag(null);
      }}
      onPointerCancel={() => setDrag(null)}
    >
      <rect x={0} y={0} width={w} height={h} fill="#1c1f26" />
      {Array.from({ length: SYSTEM.gridColumns + 1 }).map((_, i) => (
        <line key={`v${i}`} x1={i * cellPx} y1={0} x2={i * cellPx} y2={h} stroke="#2b2f38" />
      ))}
      {Array.from({ length: SYSTEM.gridRows + 1 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * cellPx} x2={w} y2={i * cellPx} stroke="#2b2f38" />
      ))}
      {boxes.map((b) => (
        <BoxRect key={b.id} box={b} cellPx={cellPx} selected={b.id === selectedId} onSelect={select} />
      ))}
      {previewRect && (
        <rect
          x={previewRect.x * cellPx}
          y={previewRect.y * cellPx}
          width={previewRect.widthCells * cellPx}
          height={previewRect.depthCells * cellPx}
          fill={previewValid ? "rgba(62,168,106,0.35)" : "rgba(226,72,59,0.35)"}
          stroke={previewValid ? "#3ea86a" : "#e2483b"}
          strokeWidth={2}
          pointerEvents="none"
        />
      )}
    </svg>
  );
}

function BoxRect({
  box,
  cellPx,
  selected,
  onSelect
}: {
  box: PlacedBox;
  cellPx: number;
  selected: boolean;
  onSelect(id: string): void;
}) {
  return (
    <g
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(box.id);
      }}
      className="cursor-pointer"
    >
      <rect
        x={box.x * cellPx + 2}
        y={box.y * cellPx + 2}
        width={box.widthCells * cellPx - 4}
        height={box.depthCells * cellPx - 4}
        fill={selected ? "#4c8cff" : "#3b6bc4"}
        stroke={selected ? "#e6e6e6" : "#0e1116"}
        strokeWidth={2}
        rx={4}
      />
      <text
        x={(box.x + box.widthCells / 2) * cellPx}
        y={(box.y + box.depthCells / 2) * cellPx + 4}
        textAnchor="middle"
        fill="#0e1116"
        fontSize={12}
        pointerEvents="none"
      >
        {box.widthCells}×{box.depthCells}
      </text>
    </g>
  );
}

function rectFromDrag(drag: DragState | null): {
  x: number;
  y: number;
  widthCells: number;
  depthCells: number;
} | null {
  if (!drag) return null;
  const x0 = Math.min(drag.originCell.x, drag.currentCell.x);
  const y0 = Math.min(drag.originCell.y, drag.currentCell.y);
  const x1 = Math.max(drag.originCell.x, drag.currentCell.x);
  const y1 = Math.max(drag.originCell.y, drag.currentCell.y);
  return { x: x0, y: y0, widthCells: x1 - x0 + 1, depthCells: y1 - y0 + 1 };
}
