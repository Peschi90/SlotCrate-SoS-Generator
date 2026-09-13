"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { SYSTEM } from "@/lib/system";
import type { Divider, Pocket } from "@/lib/schema";

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
  dividers?: Divider[];
  pockets?: Pocket[];
  pocketsFillOuter?: boolean;
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
  cornerRadiusMm = 1.5,
  dividers = [],
  pockets = [],
  pocketsFillOuter = false
}: Props) {
  const pitchMm = gridPitchMm;
  const outerW = Math.max(1, widthCells * pitchMm - 2 * outerClearanceMm);
  const outerD = Math.max(1, depthCells * pitchMm - 2 * outerClearanceMm);
  const pickupTop = SYSTEM.pickupTopZMm * (pitchMm / SYSTEM.gridPitchMm);
  const wall = wallThicknessMm;
  const floorT = SYSTEM.floorThicknessMm;
  const bodyH = Math.max(0.1, heightMm - pickupTop - floorT);
  const cornerRadiusScaled = Math.max(cornerRadiusMm, innerFloorRadiusMm);
  // small overlap eliminates z-fighting at coplanar seams between pickup/floor/wall
  const zEps = 0.02;
  const innerW = Math.max(0, outerW - 2 * wall);
  const innerD = Math.max(0, outerD - 2 * wall);
  const cavityH = Math.max(0, heightMm - pickupTop - floorT);

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
      depth: bodyH + zEps,
      bevelEnabled: false,
      curveSegments: 12
    });
    geom.computeVertexNormals();
    return geom;
  }, [outerW, outerD, wall, bodyH, cornerRadiusScaled, zEps]);

  const floorGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    drawRoundedRect(shape, 0, 0, outerW, outerD, cornerRadiusScaled);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: floorT + 2 * zEps,
      bevelEnabled: false,
      curveSegments: 12
    });
    geom.computeVertexNormals();
    return geom;
  }, [outerW, outerD, floorT, cornerRadiusScaled, zEps]);

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
      <mesh position={[0, 0, pickupTop - zEps]} geometry={floorGeometry}>
        <meshStandardMaterial
          color={color}
          metalness={0.15}
          roughness={0.6}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0, pickupTop + floorT - zEps]} geometry={wallGeometry}>
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
          args={[18.49 * (pitchMm / SYSTEM.gridPitchMm), 18.49 * (pitchMm / SYSTEM.gridPitchMm), pickupTop + zEps]}
          radius={0.6 * (pitchMm / SYSTEM.gridPitchMm)}
          smoothness={4}
          creaseAngle={0.4}
          position={[x, y, (pickupTop + zEps) / 2]}
        >
          <meshStandardMaterial color={color} metalness={0.2} roughness={0.55} />
        </RoundedBox>
      ))}
      {dividers.map((d, idx) => {
        const eff = Math.min(Math.max(0, d.heightMm), cavityH);
        if (eff <= 0) return null;
        const isX = d.axis === "x";
        const dimX = isX ? wall : innerW;
        const dimY = isX ? innerD : wall;
        const cx = isX ? wall + d.offsetMm : wall + innerW / 2;
        const cy = isX ? wall + innerD / 2 : wall + d.offsetMm;
        const cz = pickupTop + floorT + eff / 2;
        return (
          <mesh key={`div-${idx}`} position={[cx, cy, cz]}>
            <boxGeometry args={[dimX, dimY, eff]} />
            <meshStandardMaterial
              color={color}
              metalness={0.15}
              roughness={0.6}
              transparent={opacity < 1}
              opacity={opacity}
            />
          </mesh>
        );
      })}
      {pocketsFillOuter && pockets.length > 0 ? (
        <PocketSlabMesh
          pockets={pockets}
          innerW={innerW}
          innerD={innerD}
          wall={wall}
          cavityH={cavityH}
          baseZ={pickupTop + floorT}
          color={color}
          opacity={opacity}
        />
      ) : (
        pockets.map((p, idx) => (
          <PocketMesh
            key={`pocket-${idx}`}
            pocket={p}
            wall={wall}
            cavityH={cavityH}
            baseZ={pickupTop + floorT}
            color={color}
            opacity={opacity}
          />
        ))
      )}
    </group>
  );
}

interface PocketMeshProps {
  pocket: Pocket;
  wall: number;
  cavityH: number;
  baseZ: number;
  color: string;
  opacity: number;
}

function PocketMesh({ pocket, wall, cavityH, baseZ, color, opacity }: PocketMeshProps) {
  const eff = Math.min(Math.max(0, pocket.heightMm), cavityH);
  const geometry = useMemo(() => {
    const outerR = pocket.diameterMm / 2;
    const innerR = Math.max(0.1, outerR - wall);
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, eff),
      bevelEnabled: false,
      curveSegments: 24
    });
    geom.computeVertexNormals();
    return geom;
  }, [pocket.diameterMm, wall, eff]);
  if (eff <= 0) return null;
  return (
    <mesh position={[wall + pocket.centerXMm, wall + pocket.centerYMm, baseZ]} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        metalness={0.15}
        roughness={0.6}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

interface PocketSlabMeshProps {
  pockets: Pocket[];
  innerW: number;
  innerD: number;
  wall: number;
  cavityH: number;
  baseZ: number;
  color: string;
  opacity: number;
}

function PocketSlabMesh({
  pockets,
  innerW,
  innerD,
  wall,
  cavityH,
  baseZ,
  color,
  opacity
}: PocketSlabMeshProps) {
  const maxH = Math.min(
    cavityH,
    pockets.reduce((m, p) => Math.max(m, p.heightMm), 0)
  );
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(innerW, 0);
    shape.lineTo(innerW, innerD);
    shape.lineTo(0, innerD);
    shape.lineTo(0, 0);
    for (const p of pockets) {
      const innerR = Math.max(0.1, p.diameterMm / 2 - wall);
      const hole = new THREE.Path();
      hole.absarc(p.centerXMm, p.centerYMm, innerR, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.001, maxH),
      bevelEnabled: false,
      curveSegments: 24
    });
    geom.computeVertexNormals();
    return geom;
  }, [pockets, innerW, innerD, wall, maxH]);
  if (maxH <= 0) return null;
  return (
    <mesh position={[wall, wall, baseZ]} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        metalness={0.15}
        roughness={0.6}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
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
