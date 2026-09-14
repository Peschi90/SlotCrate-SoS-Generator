"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { SYSTEM } from "@/lib/system";
import { getInlayBasePositions } from "@/lib/inlay-geometry-data";
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
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const positions = getInlayBasePositions();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    return geom;
  }, []);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x3d4450,
        metalness: 0.35,
        roughness: 0.45
      }),
    []
  );

  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
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

  const holeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x0e1116,
        depthWrite: false
      }),
    []
  );

  const activeHoleOutlineMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xff7b00,
        wireframe: true
      }),
    []
  );

  return (
    <group>
      {/* Authentic Real CAD Geometry directly from reference STEP */}
      <InlayBaseMesh />

      {/* --- LEVEL 1 (LOWER SHELF) HOLES & BOTTLES --- */}
      {level1Cutouts.map((cutout, idx) => {
        const isActive = activeLevel === 1 && activeCutoutIndex === idx;
        const radius = cutout.diameterMm / 2;
        const bottleHeight = Math.min(65, L2_FLOOR_Z - L1_FLOOR_Z - 4);
        return (
          <group key={`l1-${idx}`}>
            {/* Flush hole opening on shelf plate (no collar/rim) */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L1_Z + 0.05]}
              material={isActive ? activeHoleOutlineMaterial : holeMaterial}
            >
              <circleGeometry args={[radius, 32]} />
            </mesh>
            {/* 3D Bottle standing in the rack through the hole */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L1_FLOOR_Z + 1 + bottleHeight / 2]}
              rotation={[Math.PI / 2, 0, 0]}
              material={isActive ? activeBottleMaterial : bottleMaterial}
            >
              <cylinderGeometry args={[radius * 0.98, radius * 0.98, bottleHeight, 32]} />
            </mesh>
          </group>
        );
      })}

      {/* --- LEVEL 2 (UPPER SHELF) HOLES & BOTTLES --- */}
      {level2Cutouts.map((cutout, idx) => {
        const isActive = activeLevel === 2 && activeCutoutIndex === idx;
        const radius = cutout.diameterMm / 2;
        const bottleHeight = Math.min(80, SYSTEM.inlayHeightMm - L2_FLOOR_Z - 10);
        return (
          <group key={`l2-${idx}`}>
            {/* Flush hole opening on shelf plate (no collar/rim) */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L2_Z + 0.05]}
              material={isActive ? activeHoleOutlineMaterial : holeMaterial}
            >
              <circleGeometry args={[radius, 32]} />
            </mesh>
            {/* 3D Bottle standing in the rack through the hole */}
            <mesh
              position={[cutout.centerXMm, cutout.centerYMm, L2_FLOOR_Z + 1 + bottleHeight / 2]}
              rotation={[Math.PI / 2, 0, 0]}
              material={isActive ? activeBottleMaterial : bottleMaterial}
            >
              <cylinderGeometry args={[radius * 0.98, radius * 0.98, bottleHeight, 32]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
