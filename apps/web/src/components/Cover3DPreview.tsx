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
    () => new THREE.MeshStandardMaterial({ color: 0x6f8b96, roughness: 0.5, metalness: 0.16 }),
    []
  );
  const coverGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const w = SYSTEM.coverWidthMm;
    const d = SYSTEM.coverDepthMm;
    const c = 8;
    shape.moveTo(c, 0);
    shape.lineTo(w - c, 0);
    shape.lineTo(w, c);
    shape.lineTo(w, d - c);
    shape.lineTo(w - c, d);
    shape.lineTo(c, d);
    shape.lineTo(0, d - c);
    shape.lineTo(0, c);
    shape.lineTo(c, 0);
    return new THREE.ExtrudeGeometry(shape, { depth: SYSTEM.coverHeightMm, bevelEnabled: false });
  }, []);
  const rearRecessMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x18252d, roughness: 0.85, metalness: 0.05 }),
    []
  );
  const rearRecesses = useMemo(
    () => [
      [20, 14], [SYSTEM.coverWidthMm - 20, 14],
      [20, SYSTEM.coverDepthMm - 14], [SYSTEM.coverWidthMm - 20, SYSTEM.coverDepthMm - 14],
      [8, SYSTEM.coverDepthMm / 2], [SYSTEM.coverWidthMm - 8, SYSTEM.coverDepthMm / 2]
    ] as const,
    []
  );

  return (
    <group>
      <mesh
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        geometry={coverGeometry}
        material={coverMaterial}
        receiveShadow
      />
      {rearRecesses.map(([x, y], index) => (
        <mesh key={index} position={[x, y, -0.04]} rotation={[Math.PI / 2, 0, 0]} material={rearRecessMaterial}>
          <cylinderGeometry args={[2.6, 2.6, 0.16, 32]} />
        </mesh>
      ))}
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
