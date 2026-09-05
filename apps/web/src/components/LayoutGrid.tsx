"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SYSTEM } from "@/lib/system";
import { useLayoutStore, type PlacedBox } from "@/lib/layout-store";

interface Cell {
  x: number;
  y: number;
}

interface NewDrag {
  kind: "new";
  origin: Cell;
  current: Cell;
}
interface MoveDrag {
  kind: "move";
  boxId: string;
  origin: Cell;
  current: Cell;
  box: PlacedBox;
  additive: boolean;
  moved: boolean;
}
interface ResizeDrag {
  kind: "resize";
  boxId: string;
  current: Cell;
  box: PlacedBox;
}
type Interaction = NewDrag | MoveDrag | ResizeDrag | null;

/**
 * Draufsicht auf die 10×10-Rasterplatte. Unterstützt Aufziehen neuer Kästen,
 * Drag-and-drop Verschieben, Größenanpassung per Anfasser, Mehrfachauswahl
 * (Ctrl/Shift-Klick) sowie Pfeiltasten-Verschiebung.
 */
export function LayoutGrid({
  minCells = SYSTEM.minCells,
  maxWidthCells = SYSTEM.maxCells,
  maxDepthCells = SYSTEM.maxCells,
  highlightFree = false
}: {
  minCells?: number;
  maxWidthCells?: number;
  maxDepthCells?: number;
  highlightFree?: boolean;
}) {
  const boxes = useLayoutStore((s) => s.boxes);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const selectedIds = useLayoutStore((s) => s.selectedIds);
  const addBox = useLayoutStore((s) => s.addBox);
  const canPlace = useLayoutStore((s) => s.canPlace);
  const select = useLayoutStore((s) => s.select);
  const toggleSelect = useLayoutStore((s) => s.toggleSelect);
  const clearSelection = useLayoutStore((s) => s.clearSelection);
  const removeSelected = useLayoutStore((s) => s.removeSelected);
  const moveBox = useLayoutStore((s) => s.moveBox);
  const moveSelected = useLayoutStore((s) => s.moveSelected);
  const resizeBox = useLayoutStore((s) => s.resizeBox);

  const svgRef = useRef<SVGSVGElement>(null);
  const [interaction, setInteraction] = useState<Interaction>(null);
  const cellPx = 36;
  const w = SYSTEM.gridColumns * cellPx;
  const h = SYSTEM.gridRows * cellPx;

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const occupiedCells = useMemo(() => {
    const set = new Set<number>();
    for (const b of boxes) {
      for (let i = b.x; i < b.x + b.widthCells; i++) {
        for (let j = b.y; j < b.y + b.depthCells; j++) {
          set.add(i * SYSTEM.gridColumns + j);
        }
      }
    }
    return set;
  }, [boxes]);

  function cellFromEvent(e: React.PointerEvent<SVGSVGElement>): Cell | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const drawSize = Math.min(rect.width, rect.height);
    const offsetX = (rect.width - drawSize) / 2;
    const offsetY = (rect.height - drawSize) / 2;
    const localX = e.clientX - rect.left - offsetX;
    const localY = e.clientY - rect.top - offsetY;
    if (localX < 0 || localY < 0 || localX >= drawSize || localY >= drawSize) return null;
    const px = (localX / drawSize) * w;
    const py = (localY / drawSize) * h;
    const gx = Math.floor(px / cellPx);
    const gy = Math.floor(py / cellPx);
    if (gx < 0 || gy < 0 || gx >= SYSTEM.gridColumns || gy >= SYSTEM.gridRows) return null;
    return { x: gx, y: gy };
  }

  // --- Tastatur: Löschen, Pfeiltasten, Escape ---
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      const target = ev.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }
      if ((ev.key === "Delete" || ev.key === "Backspace") && selectedIds.length > 0) {
        ev.preventDefault();
        removeSelected();
        return;
      }
      if (ev.key === "Escape") {
        clearSelection();
        return;
      }
      const arrow: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1]
      };
      const delta = arrow[ev.key];
      if (delta && selectedIds.length > 0) {
        ev.preventDefault();
        moveSelected(delta[0], delta[1]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, removeSelected, clearSelection, moveSelected]);

  // --- Interaktions-Preview & Validierung ---
  const preview = useMemo(() => computePreview(interaction), [interaction]);
  const previewValid = useMemo(() => {
    if (!preview || !interaction) return false;
    if (interaction.kind === "new") {
      return (
        preview.widthCells >= minCells &&
        preview.depthCells >= minCells &&
        preview.widthCells <= maxWidthCells &&
        preview.depthCells <= maxDepthCells &&
        canPlace(preview.x, preview.y, preview.widthCells, preview.depthCells)
      );
    }
    if (interaction.kind === "move") {
      return canPlace(
        preview.x,
        preview.y,
        preview.widthCells,
        preview.depthCells,
        interaction.boxId
      );
    }
    // resize
    return (
      preview.widthCells >= minCells &&
      preview.depthCells >= minCells &&
      preview.widthCells <= maxWidthCells &&
      preview.depthCells <= maxDepthCells &&
      canPlace(
        preview.x,
        preview.y,
        preview.widthCells,
        preview.depthCells,
        interaction.boxId
      )
    );
  }, [preview, interaction, canPlace, minCells, maxWidthCells, maxDepthCells]);

  function startBoxInteraction(e: React.PointerEvent<SVGSVGElement>, box: PlacedBox) {
    const c = cellFromEvent(e);
    if (!c) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setInteraction({
      kind: "move",
      boxId: box.id,
      origin: c,
      current: c,
      box,
      additive: e.ctrlKey || e.metaKey || e.shiftKey,
      moved: false
    });
  }

  function startResizeInteraction(e: React.PointerEvent<SVGSVGElement>, box: PlacedBox) {
    const c = cellFromEvent(e);
    if (!c) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setInteraction({ kind: "resize", boxId: box.id, current: c, box });
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!interaction) return;
    const c = cellFromEvent(e);
    if (!c) return;
    setInteraction((prev) => {
      if (!prev) return prev;
      if (prev.kind === "new") return { ...prev, current: c };
      if (prev.kind === "move") {
        const moved = prev.moved || c.x !== prev.origin.x || c.y !== prev.origin.y;
        return { ...prev, current: c, moved };
      }
      return { ...prev, current: c };
    });
  }

  function commitInteraction() {
    if (!interaction) return;
    if (interaction.kind === "new") {
      const r = computePreview(interaction);
      if (
        r &&
        r.widthCells >= minCells &&
        r.depthCells >= minCells &&
        r.widthCells <= maxWidthCells &&
        r.depthCells <= maxDepthCells
      ) {
        const created = addBox(r.x, r.y, r.widthCells, r.depthCells);
        if (created) select(created.id);
      }
    } else if (interaction.kind === "move") {
      if (!interaction.moved) {
        // Klick ohne Ziehen → auswählen bzw. toggeln.
        if (interaction.additive) {
          toggleSelect(interaction.boxId);
        } else {
          select(interaction.boxId);
        }
      } else {
        const r = computePreview(interaction);
        if (r) moveBox(interaction.boxId, r.x, r.y);
      }
    } else {
      const r = computePreview(interaction);
      if (r) resizeBox(interaction.boxId, r.widthCells, r.depthCells);
    }
    setInteraction(null);
  }

  const showResizeHandle = selectedIds.length === 1 && !!selectedId;
  const primarySelected = boxes.find((b) => b.id === selectedId) ?? null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full bg-neutral-900 select-none touch-none"
      onPointerDown={(e) => {
        const c = cellFromEvent(e);
        if (!c) return;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        setInteraction({ kind: "new", origin: c, current: c });
        if (!(e.ctrlKey || e.metaKey || e.shiftKey)) clearSelection();
      }}
      onPointerMove={onPointerMove}
      onPointerUp={commitInteraction}
      onPointerCancel={() => setInteraction(null)}
    >
      <rect x={0} y={0} width={w} height={h} fill="#1c1f26" />
      {Array.from({ length: SYSTEM.gridColumns + 1 }).map((_, i) => (
        <line key={`v${i}`} x1={i * cellPx} y1={0} x2={i * cellPx} y2={h} stroke="#2b2f38" />
      ))}
      {Array.from({ length: SYSTEM.gridRows + 1 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * cellPx} x2={w} y2={i * cellPx} stroke="#2b2f38" />
      ))}

      {highlightFree && (
        <g pointerEvents="none">
          {Array.from({ length: SYSTEM.gridColumns * SYSTEM.gridRows }).map((_, idx) => {
            if (occupiedCells.has(idx)) return null;
            const x = Math.floor(idx / SYSTEM.gridColumns);
            const y = idx % SYSTEM.gridColumns;
            return (
              <rect
                key={`f${idx}`}
                x={x * cellPx + 1}
                y={y * cellPx + 1}
                width={cellPx - 2}
                height={cellPx - 2}
                fill="rgba(250, 204, 21, 0.18)"
              />
            );
          })}
        </g>
      )}

      {boxes.map((b) => (
        <BoxRect
          key={b.id}
          box={b}
          cellPx={cellPx}
          selected={selectedSet.has(b.id)}
          primary={b.id === selectedId}
          onPointerDown={(e) => {
            e.stopPropagation();
            startBoxInteraction(e as unknown as React.PointerEvent<SVGSVGElement>, b);
          }}
          dimmed={interaction?.kind === "move" && interaction.boxId === b.id && interaction.moved}
        />
      ))}

      {showResizeHandle && primarySelected && (
        <ResizeHandle
          box={primarySelected}
          cellPx={cellPx}
          onPointerDown={(e) => {
            e.stopPropagation();
            startResizeInteraction(e as unknown as React.PointerEvent<SVGSVGElement>, primarySelected);
          }}
        />
      )}

      {preview && (
        <rect
          x={preview.x * cellPx}
          y={preview.y * cellPx}
          width={preview.widthCells * cellPx}
          height={preview.depthCells * cellPx}
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
  primary,
  dimmed,
  onPointerDown
}: {
  box: PlacedBox;
  cellPx: number;
  selected: boolean;
  primary: boolean;
  dimmed: boolean;
  onPointerDown(e: React.PointerEvent<SVGGElement>): void;
}) {
  const fill = primary ? "#4c8cff" : selected ? "#5f7ec8" : "#3b6bc4";
  const stroke = primary ? "#ffffff" : selected ? "#e6e6e6" : "#0e1116";
  return (
    <g onPointerDown={onPointerDown} className="cursor-grab" opacity={dimmed ? 0.4 : 1}>
      <rect
        x={box.x * cellPx + 2}
        y={box.y * cellPx + 2}
        width={box.widthCells * cellPx - 4}
        height={box.depthCells * cellPx - 4}
        fill={fill}
        stroke={stroke}
        strokeWidth={selected ? 2.5 : 2}
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

function ResizeHandle({
  box,
  cellPx,
  onPointerDown
}: {
  box: PlacedBox;
  cellPx: number;
  onPointerDown(e: React.PointerEvent<SVGGElement>): void;
}) {
  const cx = (box.x + box.widthCells) * cellPx - 6;
  const cy = (box.y + box.depthCells) * cellPx - 6;
  return (
    <g onPointerDown={onPointerDown} className="cursor-se-resize">
      <rect x={cx - 6} y={cy - 6} width={14} height={14} fill="#ffffff" stroke="#0e1116" strokeWidth={1.5} rx={2} />
      <path d={`M ${cx - 3} ${cy + 4} L ${cx + 4} ${cy - 3}`} stroke="#0e1116" strokeWidth={1.5} />
    </g>
  );
}

function computePreview(interaction: Interaction): {
  x: number;
  y: number;
  widthCells: number;
  depthCells: number;
} | null {
  if (!interaction) return null;
  if (interaction.kind === "new") {
    const x0 = Math.min(interaction.origin.x, interaction.current.x);
    const y0 = Math.min(interaction.origin.y, interaction.current.y);
    const x1 = Math.max(interaction.origin.x, interaction.current.x);
    const y1 = Math.max(interaction.origin.y, interaction.current.y);
    return { x: x0, y: y0, widthCells: x1 - x0 + 1, depthCells: y1 - y0 + 1 };
  }
  if (interaction.kind === "move") {
    const dx = interaction.current.x - interaction.origin.x;
    const dy = interaction.current.y - interaction.origin.y;
    let x = interaction.box.x + dx;
    let y = interaction.box.y + dy;
    x = Math.max(0, Math.min(SYSTEM.gridColumns - interaction.box.widthCells, x));
    y = Math.max(0, Math.min(SYSTEM.gridRows - interaction.box.depthCells, y));
    return {
      x,
      y,
      widthCells: interaction.box.widthCells,
      depthCells: interaction.box.depthCells
    };
  }
  const w = Math.max(1, interaction.current.x - interaction.box.x + 1);
  const d = Math.max(1, interaction.current.y - interaction.box.y + 1);
  return {
    x: interaction.box.x,
    y: interaction.box.y,
    widthCells: Math.min(SYSTEM.gridColumns - interaction.box.x, w),
    depthCells: Math.min(SYSTEM.gridRows - interaction.box.y, d)
  };
}
