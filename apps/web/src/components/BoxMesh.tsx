"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { SYSTEM } from "@/lib/system";

interface Props {
  widthCells: number;
  depthCells: number;
  heightMm: number;
  gridPitchMm?: number;
  wallThicknessMm?: number;
  innerFloorRadiusMm?: number;
  outerClearanceMm?: number;
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
  gridPitchMm = SYSTEM.gridPitchMm,
  wallThicknessMm = SYSTEM.wallThicknessMm,
  innerFloorRadiusMm = 2.5,
  outerClearanceMm = 0,
  color = "#7fb0ff",
  opacity = 1,
  cornerRadiusMm = 1.5
}: Props) {
  const pitchMm = gridPitchMm;
  const outerW = Math.max(1, widthCells * pitchMm - 2 * outerClearanceMm);
  const outerD = Math.max(1, depthCells * pitchMm - 2 * outerClearanceMm);
  const pickupTop = SYSTEM.pickupTopZMm * (pitchMm / SYSTEM.gridPitchMm);
  const wall = wallThicknessMm;
  const floorT = SYSTEM.floorThicknessMm;
  const bodyH = Math.max(0.1, heightMm - pickupTop - floorT);
  const cornerRadiusScaled = Math.max(cornerRadiusMm, innerFloorRadiusMm);

  const wallGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    drawRoundedRect(shape, 0, 0, outerW, outerD, cornerRadiusScaled);
    const hole = new THREE.Path();
    drawRoundedRect(
      hole,
      wall,
      wall,
      outerW - 2 * wall,
      outerD - 2 * wall,
      Math.max(0, cornerRadiusScaled - wall)
    );
    shape.holes.push(hole);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: bodyH,
      bevelEnabled: false,
      curveSegments: 12
    });
    geom.computeVertexNormals();
    return geom;
  }, [outerW, outerD, wall, bodyH, cornerRadiusScaled]);

  const floorGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    drawRoundedRect(shape, 0, 0, outerW, outerD, cornerRadiusScaled);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: floorT,
      bevelEnabled: false,
      curveSegments: 12
    });
    geom.computeVertexNormals();
    return geom;
  }, [outerW, outerD, floorT, cornerRadiusScaled]);

  const pickupPositions = useMemo(() => {
    const positions: [number, number][] = [];
    for (let i = 0; i < widthCells; i++) {
      for (let j = 0; j < depthCells; j++) {
        positions.push([(i + 0.5) * pitchMm, (j + 0.5) * pitchMm]);
      }
    }
    return positions;
  }, [widthCells, depthCells, pitchMm]);

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
          args={[18.49 * (pitchMm / SYSTEM.gridPitchMm), 18.49 * (pitchMm / SYSTEM.gridPitchMm), pickupTop]}
          radius={0.6 * (pitchMm / SYSTEM.gridPitchMm)}
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
