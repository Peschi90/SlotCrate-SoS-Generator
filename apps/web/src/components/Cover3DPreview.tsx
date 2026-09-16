"use client";

import { Text } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
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
  const coverMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x3d4450, roughness: 0.42, metalness: 0.28 }),
    []
  );
  const textMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x151a21, roughness: 0.7, metalness: 0.05 }),
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
        <Text
          fontSize={fontSizeMm}
          anchorX="center"
          anchorY="middle"
          color="#121820"
          material={textMaterial}
          maxWidth={SYSTEM.coverWidthMm - SYSTEM.coverEdgeMarginMm * 2}
          overflowWrap="break-word"
        >
          {text || "Text"}
        </Text>
        <Text
          fontSize={fontSizeMm}
          anchorX="center"
          anchorY="middle"
          color="#1a2029"
          outlineColor="#f0b35b"
          outlineWidth={SYSTEM.coverGrooveWidthMm}
          outlineOpacity={0.9}
          maxWidth={SYSTEM.coverWidthMm - SYSTEM.coverEdgeMarginMm * 2}
          overflowWrap="break-word"
          position={[0, 0, -0.02]}
        >
          {text || "Text"}
        </Text>
      </group>
    </group>
  );
}
