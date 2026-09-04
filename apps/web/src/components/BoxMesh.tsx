"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { SYSTEM } from "@/lib/system";

interface Props {
  widthCells: number;
  depthCells: number;
  heightMm: number;
  color?: string;
  opacity?: number;
  cornerRadiusMm?: number;
}

/**
 * Vorschau eines SlotCrate-Kastens: gerundete Außenschale mit
 * Innenraum-Aussparung (als eine ExtrudeGeometry mit Loch), massiver
 * Boden, N·M Bodenaufnahmen. Zentrum liegt auf (widthCells/2·pitch,
 * depthCells/2·pitch, 0).
 */
export function BoxMesh({
  widthCells,
  depthCells,
  heightMm,
  color = "#7fb0ff",
  opacity = 1,
  cornerRadiusMm = 1.5
}: Props) {
  const outerW = widthCells * SYSTEM.gridPitchMm;
  const outerD = depthCells * SYSTEM.gridPitchMm;
  const pickupTop = SYSTEM.pickupTopZMm;
  const wall = SYSTEM.wallThicknessMm;
  const floorT = SYSTEM.floorThicknessMm;
  const bodyH = Math.max(0.1, heightMm - pickupTop - floorT);

  const wallGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    drawRoundedRect(shape, 0, 0, outerW, outerD, cornerRadiusMm);
    const hole = new THREE.Path();
    drawRoundedRect(
      hole,
      wall,
      wall,
      outerW - 2 * wall,
      outerD - 2 * wall,
      Math.max(0, cornerRadiusMm - wall)
    );
    shape.holes.push(hole);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: bodyH,
      bevelEnabled: false,
      curveSegments: 12
    });
    geom.computeVertexNormals();
    return geom;
  }, [outerW, outerD, wall, bodyH, cornerRadiusMm]);

  const floorGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    drawRoundedRect(shape, 0, 0, outerW, outerD, cornerRadiusMm);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: floorT,
      bevelEnabled: false,
      curveSegments: 12
    });
    geom.computeVertexNormals();
    return geom;
  }, [outerW, outerD, floorT, cornerRadiusMm]);

  const pickupPositions = useMemo(() => {
    const positions: [number, number][] = [];
    for (let i = 0; i < widthCells; i++) {
      for (let j = 0; j < depthCells; j++) {
        positions.push([(i + 0.5) * SYSTEM.gridPitchMm, (j + 0.5) * SYSTEM.gridPitchMm]);
      }
    }
    return positions;
  }, [widthCells, depthCells]);

  return (
    <group>
      <mesh position={[0, 0, pickupTop]} geometry={floorGeometry}>
        <meshStandardMaterial
          color={color}
          metalness={0.15}
          roughness={0.6}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0, pickupTop + floorT]} geometry={wallGeometry}>
        <meshStandardMaterial
          color={color}
          metalness={0.15}
          roughness={0.6}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {pickupPositions.map(([x, y], idx) => (
        <RoundedBox
          key={idx}
          args={[18.49, 18.49, pickupTop]}
          radius={0.6}
          smoothness={4}
          creaseAngle={0.4}
          position={[x, y, pickupTop / 2]}
        >
          <meshStandardMaterial color={color} metalness={0.2} roughness={0.55} />
        </RoundedBox>
      ))}
    </group>
  );
}

function drawRoundedRect(
  path: THREE.Path,
  x: number,
  y: number,
  w: number,
  d: number,
  r: number
): void {
  const rr = Math.max(0, Math.min(r, w / 2 - 0.001, d / 2 - 0.001));
  if (rr <= 0.001) {
    path.moveTo(x, y);
    path.lineTo(x + w, y);
    path.lineTo(x + w, y + d);
    path.lineTo(x, y + d);
    path.lineTo(x, y);
    return;
  }
  path.moveTo(x + rr, y);
  path.lineTo(x + w - rr, y);
  path.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  path.lineTo(x + w, y + d - rr);
  path.absarc(x + w - rr, y + d - rr, rr, 0, Math.PI / 2, false);
  path.lineTo(x + rr, y + d);
  path.absarc(x + rr, y + d - rr, rr, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + rr);
  path.absarc(x + rr, y + rr, rr, Math.PI, (3 * Math.PI) / 2, false);
}
