"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { SYSTEM } from "@/lib/system";
import type { InlayCutout } from "@/lib/schema";

interface Props {
  level1Cutouts: InlayCutout[];
  level2Cutouts: InlayCutout[];
  activeLevel?: 1 | 2;
  activeCutoutIndex?: number | null;
}

const W = SYSTEM.inlayWidthMm; // 57.4 mm
const D = SYSTEM.inlayDepthMm; // 224.6 mm
const H = SYSTEM.inlayHeightMm; // 215.4 mm
const L1_Z = SYSTEM.inlayLevel1ShelfZMm; // 28.6 mm
const L2_Z = SYSTEM.inlayLevel2ShelfZMm; // 128.9 mm
const L1_FLOOR_Z = 8.5;
const L2_FLOOR_Z = 96.5;

export function InlayMesh({
  level1Cutouts,
  level2Cutouts,
  activeLevel,
  activeCutoutIndex
}: Props) {
  // Material-Farben wie im SlotCrate Generator (Dark Gunmetal Frame + Orange Accents)
  const frameMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x22272e,
        metalness: 0.2,
        roughness: 0.6
      }),
    []
  );

  const shelfMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x30363d,
        metalness: 0.3,
        roughness: 0.5
      }),
    []
  );

  const bottleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x58a6ff,
        transparent: true,
        opacity: 0.45,
        roughness: 0.2,
        metalness: 0.1
      }),
    []
  );

  const activeBottleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xff7b00,
        transparent: true,
        opacity: 0.75,
        roughness: 0.2,
        metalness: 0.2
      }),
    []
  );

  const ringMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x58a6ff,
        metalness: 0.5,
        roughness: 0.4
      }),
    []
  );

  const activeRingMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xff7b00,
        metalness: 0.6,
        roughness: 0.3
      }),
    []
  );

  return (
    <group>
      {/* --- FRAME STRUCTURE --- */}
      {/* Bottom Base Plate */}
      <mesh position={[W / 2, D / 2, 4]} material={frameMaterial}>
        <boxGeometry args={[W, D, 8]} />
      </mesh>

      {/* Back Wall / Rail Column */}
      <mesh position={[W / 2, D - 4, H / 2]} material={frameMaterial}>
        <boxGeometry args={[W, 8, H]} />
      </mesh>

      {/* Front Pull Handle / Wall */}
      <mesh position={[W / 2, 4, H / 2]} material={frameMaterial}>
        <boxGeometry args={[W, 8, H]} />
      </mesh>

      {/* Side Rail Struts Left */}
      <mesh position={[2, D / 2, H / 2]} material={frameMaterial}>
        <boxGeometry args={[4, D - 16, H]} />
      </mesh>

      {/* Side Rail Struts Right */}
      <mesh position={[W - 2, D / 2, H / 2]} material={frameMaterial}>
        <boxGeometry args={[4, D - 16, H]} />
      </mesh>

      {/* --- LEVEL 1 (LOWER SHELF) --- */}
      {/* Floor plate */}
      <mesh position={[W / 2, D / 2, L1_FLOOR_Z]} material={shelfMaterial}>
        <boxGeometry args={[W - 8, D - 16, 2]} />
      </mesh>
      {/* Top perforated plate */}
      <mesh position={[W / 2, D / 2, L1_Z]} material={shelfMaterial}>
        <boxGeometry args={[W - 8, D - 16, 2.5]} />
      </mesh>

      {/* Level 1 Cutouts & Bottles */}
      {level1Cutouts.map((cutout, idx) => {
        const isActive = activeLevel === 1 && activeCutoutIndex === idx;
        const radius = cutout.diameterMm / 2;
        const bottleHeight = Math.min(65, L2_FLOOR_Z - L1_FLOOR_Z - 5);
        return (
          <group key={`l1-${idx}`}>
            {/* Cutout Ring on shelf plate */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L1_Z + 1.3]}
              material={isActive ? activeRingMaterial : ringMaterial}
            >
              <ringGeometry args={[radius * 0.92, radius * 1.05, 32]} />
            </mesh>
            {/* Bottle cylinder standing on floor */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L1_FLOOR_Z + 1 + bottleHeight / 2]}
              rotation={[Math.PI / 2, 0, 0]}
              material={isActive ? activeBottleMaterial : bottleMaterial}
            >
              <cylinderGeometry args={[radius * 0.95, radius * 0.95, bottleHeight, 32]} />
            </mesh>
          </group>
        );
      })}

      {/* --- LEVEL 2 (UPPER SHELF) --- */}
      {/* Floor plate */}
      <mesh position={[W / 2, D / 2, L2_FLOOR_Z]} material={shelfMaterial}>
        <boxGeometry args={[W - 8, D - 16, 2]} />
      </mesh>
      {/* Top perforated plate */}
      <mesh position={[W / 2, D / 2, L2_Z]} material={shelfMaterial}>
        <boxGeometry args={[W - 8, D - 16, 2.5]} />
      </mesh>

      {/* Level 2 Cutouts & Bottles */}
      {level2Cutouts.map((cutout, idx) => {
        const isActive = activeLevel === 2 && activeCutoutIndex === idx;
        const radius = cutout.diameterMm / 2;
        const bottleHeight = Math.min(80, H - L2_FLOOR_Z - 10);
        return (
          <group key={`l2-${idx}`}>
            {/* Cutout Ring on shelf plate */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L2_Z + 1.3]}
              material={isActive ? activeRingMaterial : ringMaterial}
            >
              <ringGeometry args={[radius * 0.92, radius * 1.05, 32]} />
            </mesh>
            {/* Bottle cylinder standing on floor */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L2_FLOOR_Z + 1 + bottleHeight / 2]}
              rotation={[Math.PI / 2, 0, 0]}
              material={isActive ? activeBottleMaterial : bottleMaterial}
            >
              <cylinderGeometry args={[radius * 0.95, radius * 0.95, bottleHeight, 32]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
