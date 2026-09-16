"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CadCanvas } from "./CadCanvas";
import { SYSTEM } from "@/lib/system";

interface Props {
  text: string;
  fontSizeMm: number;
  centerXMm: number;
  centerYMm: number;
  rotationDeg: number;
  onTransformChange(change: { centerXMm?: number; centerYMm?: number; rotationDeg?: number }): void;
}

export function Cover3DPreview(props: Props) {
  return (
    <CadCanvas
      center={[SYSTEM.coverWidthMm / 2, SYSTEM.coverDepthMm / 2, SYSTEM.coverHeightMm / 2]}
      radius={Math.max(SYSTEM.coverWidthMm, SYSTEM.coverDepthMm) * 0.9}
    >
      <CoverScene {...props} />
    </CadCanvas>
  );
}

function CoverScene({
  text,
  fontSizeMm,
  centerXMm,
  centerYMm,
  rotationDeg,
  onTransformChange
}: Props) {
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0, centerX: 0, centerY: 0, rotation: 0, rotate: false });
  const textTexture = useCoverTextTexture(text || "Text", fontSizeMm);
  const coverMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x3d4450, roughness: 0.42, metalness: 0.28 }),
    []
  );

  return (
    <group>
      <mesh
        position={[SYSTEM.coverWidthMm / 2, SYSTEM.coverDepthMm / 2, SYSTEM.coverHeightMm / 2]}
        material={coverMaterial}
        receiveShadow
      >
        <boxGeometry args={[SYSTEM.coverWidthMm, SYSTEM.coverDepthMm, SYSTEM.coverHeightMm]} />
      </mesh>
      <group
        position={[centerXMm, centerYMm, SYSTEM.coverHeightMm + 0.08]}
        rotation={[0, 0, (rotationDeg * Math.PI) / 180]}
        onPointerDown={(event) => {
          event.stopPropagation();
          start.current = {
            x: event.point.x,
            y: event.point.y,
            centerX: centerXMm,
            centerY: centerYMm,
            rotation: rotationDeg,
            rotate: event.shiftKey
          };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          event.stopPropagation();
          if (start.current.rotate) {
            onTransformChange({ rotationDeg: start.current.rotation + (event.point.x - start.current.x) * 1.5 });
          } else {
            onTransformChange({
              centerXMm: start.current.centerX + event.point.x - start.current.x,
              centerYMm: start.current.centerY + event.point.y - start.current.y
            });
          }
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          setDragging(false);
        }}
        onPointerOut={() => setDragging(false)}
      >
        {textTexture && (
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[textTexture.widthMm, textTexture.heightMm]} />
            <meshStandardMaterial
              map={textTexture.texture}
              transparent
              roughness={0.7}
              metalness={0.05}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

function useCoverTextTexture(text: string, fontSizeMm: number) {
  const [result, setResult] = useState<{
    texture: THREE.CanvasTexture;
    widthMm: number;
    heightMm: number;
  } | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;

    const fontPx = 160;
    const paddingPx = 32;
    context.font = `600 ${fontPx}px Rajdhani, sans-serif`;
    const measuredWidth = Math.ceil(context.measureText(text).width);
    canvas.width = Math.max(256, measuredWidth + paddingPx * 2);
    canvas.height = 240;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = `600 ${fontPx}px Rajdhani, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.lineWidth = Math.max(5, fontPx * (SYSTEM.coverGrooveWidthMm / (fontSizeMm * 2)));
    context.strokeStyle = "#f0b35b";
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    context.fillStyle = "#121820";
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const mmPerPixel = fontSizeMm / fontPx;
    const maxWidthMm = SYSTEM.coverWidthMm - SYSTEM.coverEdgeMarginMm * 2;
    const naturalWidthMm = canvas.width * mmPerPixel;
    const widthMm = Math.min(maxWidthMm, naturalWidthMm);
    const heightMm = canvas.height * mmPerPixel * (widthMm / naturalWidthMm);
    setResult({ texture, widthMm, heightMm });

    return () => texture.dispose();
  }, [fontSizeMm, text]);

  return result;
}
