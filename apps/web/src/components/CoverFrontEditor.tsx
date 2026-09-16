"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { previewFontFamily, SYSTEM } from "@/lib/system";

interface Props {
  text: string;
  fontName: string;
  fontSizeMm: number;
  centerXMm: number;
  centerYMm: number;
  rotationDeg: number;
  onTransformChange(change: { centerXMm?: number; centerYMm?: number; rotationDeg?: number }): void;
}

type DragMode = "move" | "rotate";

export function CoverFrontEditor(props: Props) {
  const t = useTranslations("cover");
  const { onTransformChange } = props;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; x: number; y: number; rotation: number } | null>(null);
  const [active, setActive] = useState<DragMode | null>(null);

  const point = (event: React.PointerEvent<SVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: props.centerXMm, y: props.centerYMm };
    return {
      x: ((event.clientX - rect.left) / rect.width) * SYSTEM.coverWidthMm,
      y: ((event.clientY - rect.top) / rect.height) * SYSTEM.coverDepthMm
    };
  };

  const begin = (event: React.PointerEvent<SVGElement>, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    const p = point(event);
    dragRef.current = { mode, startX: p.x, startY: p.y, x: props.centerXMm, y: props.centerYMm, rotation: props.rotationDeg };
    setActive(mode);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move = (event: React.PointerEvent<SVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = point(event);
    if (drag.mode === "move") {
      onTransformChange({
        centerXMm: Math.max(SYSTEM.coverEdgeMarginMm, Math.min(SYSTEM.coverWidthMm - SYSTEM.coverEdgeMarginMm, drag.x + p.x - drag.startX)),
        centerYMm: Math.max(SYSTEM.coverEdgeMarginMm, Math.min(SYSTEM.coverDepthMm - SYSTEM.coverEdgeMarginMm, drag.y + p.y - drag.startY))
      });
      return;
    }
    const angle = Math.atan2(p.y - props.centerYMm, p.x - props.centerXMm) * (180 / Math.PI) + 90;
    onTransformChange({ rotationDeg: Math.max(-180, Math.min(180, angle)) });
  };

  const end = (event: React.PointerEvent<SVGElement>) => {
    dragRef.current = null;
    setActive(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{t("frontEditorTitle")}</h2>
          <p className="text-xs text-white/50">{t("frontEditorHint")}</p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-[#7ed321] font-mono">{t("frontLabel")}</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-white/15 bg-[#17252c]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SYSTEM.coverWidthMm} ${SYSTEM.coverDepthMm}`}
          className={`block w-full aspect-[116/216] touch-none ${active ? "cursor-grabbing" : "cursor-grab"}`}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <path
            d={`M 8 0 H ${SYSTEM.coverWidthMm - 8} L ${SYSTEM.coverWidthMm} 8 V ${SYSTEM.coverDepthMm - 8} L ${SYSTEM.coverWidthMm - 8} ${SYSTEM.coverDepthMm} H 8 L 0 ${SYSTEM.coverDepthMm - 8} V 8 Z`}
            fill="#7896a1"
            stroke="#a9c1c7"
            strokeWidth="0.8"
          />
          <g
            transform={`translate(${props.centerXMm} ${props.centerYMm}) rotate(${props.rotationDeg})`}
            onPointerDown={(event) => begin(event, "move")}
          >
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily={previewFontFamily(props.fontName)}
              fontWeight="700"
              fontSize={props.fontSizeMm}
              fill="#111b20"
              stroke="#f0b35b"
              strokeWidth={SYSTEM.coverGrooveWidthMm / 2}
              paintOrder="stroke"
              vectorEffect="non-scaling-stroke"
              className="select-none"
            >
              {props.text || "Text"}
            </text>
            <circle
              cx="0"
              cy={-(props.fontSizeMm + 10)}
              r="3.2"
              fill="#f0b35b"
              stroke="#111b20"
              strokeWidth="0.8"
              onPointerDown={(event) => begin(event, "rotate")}
            />
            <line x1="0" y1={-props.fontSizeMm / 2} x2="0" y2={-(props.fontSizeMm + 7)} stroke="#f0b35b" strokeWidth="1" />
          </g>
        </svg>
      </div>
    </section>
  );
}
