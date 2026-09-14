"use client";

import { useMemo, Suspense } from "react";
import { useLoader } from "@react-three/fiber";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";
import { SYSTEM } from "@/lib/system";
import type { InlayCutout } from "@/lib/schema";

interface Props {
  level1Cutouts: InlayCutout[];
  level2Cutouts: InlayCutout[];
  activeLevel?: 1 | 2;
  activeCutoutIndex?: number | null;
}

const L1_Z = SYSTEM.inlayLevel1ShelfZMm; // 28.6 mm
const L2_Z = SYSTEM.inlayLevel2ShelfZMm; // 128.9 mm
const L1_FLOOR_Z = 8.5;
const L2_FLOOR_Z = 96.5;

function InlayBaseMesh() {
  const geom = useLoader(STLLoader, "/models/inlay-base.stl");

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x3d4450,
        metalness: 0.35,
        roughness: 0.45
      }),
    []
  );

  return <mesh geometry={geom} material={material} castShadow receiveShadow />;
}

export function InlayMesh({
  level1Cutouts,
  level2Cutouts,
  activeLevel,
  activeCutoutIndex
}: Props) {
  const bottleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x58a6ff,
        transparent: true,
        opacity: 0.55,
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
        opacity: 0.8,
        roughness: 0.2,
        metalness: 0.2
      }),
    []
  );

  const ringMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x58a6ff,
        metalness: 0.6,
        roughness: 0.3
      }),
    []
  );

  const activeRingMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xff7b00,
        metalness: 0.7,
        roughness: 0.2
      }),
    []
  );

  return (
    <group>
      {/* Authentic Real CAD Geometry from reference STEP */}
      <Suspense fallback={null}>
        <InlayBaseMesh />
      </Suspense>

      {/* --- LEVEL 1 (LOWER SHELF) INDICATORS & BOTTLES --- */}
      {level1Cutouts.map((cutout, idx) => {
        const isActive = activeLevel === 1 && activeCutoutIndex === idx;
        const radius = cutout.diameterMm / 2;
        const bottleHeight = Math.min(65, L2_FLOOR_Z - L1_FLOOR_Z - 4);
        return (
          <group key={`l1-${idx}`}>
            {/* Cutout Ring on shelf plate */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L1_Z + 0.3]}
              material={isActive ? activeRingMaterial : ringMaterial}
            >
              <ringGeometry args={[radius * 0.92, radius * 1.05, 32]} />
            </mesh>
            {/* 3D Bottle standing in the rack */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L1_FLOOR_Z + 1 + bottleHeight / 2]}
              rotation={[Math.PI / 2, 0, 0]}
              material={isActive ? activeBottleMaterial : bottleMaterial}
            >
              <cylinderGeometry args={[radius * 0.96, radius * 0.96, bottleHeight, 32]} />
            </mesh>
          </group>
        );
      })}

      {/* --- LEVEL 2 (UPPER SHELF) INDICATORS & BOTTLES --- */}
      {level2Cutouts.map((cutout, idx) => {
        const isActive = activeLevel === 2 && activeCutoutIndex === idx;
        const radius = cutout.diameterMm / 2;
        const bottleHeight = Math.min(80, SYSTEM.inlayHeightMm - L2_FLOOR_Z - 10);
        return (
          <group key={`l2-${idx}`}>
            {/* Cutout Ring on shelf plate */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L2_Z + 0.3]}
              material={isActive ? activeRingMaterial : ringMaterial}
            >
              <ringGeometry args={[radius * 0.92, radius * 1.05, 32]} />
            </mesh>
            {/* 3D Bottle standing in the rack */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L2_FLOOR_Z + 1 + bottleHeight / 2]}
              rotation={[Math.PI / 2, 0, 0]}
              material={isActive ? activeBottleMaterial : bottleMaterial}
            >
              <cylinderGeometry args={[radius * 0.96, radius * 0.96, bottleHeight, 32]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
