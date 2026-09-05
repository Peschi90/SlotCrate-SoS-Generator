"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { CadCanvas } from "./CadCanvas";
import { BoxMesh } from "./BoxMesh";
import { SYSTEM } from "@/lib/system";
import { useLayoutStore } from "@/lib/layout-store";

/**
 * 3D-Ansicht der 10×10-Grundrasterplatte plus platzierte Kästen.
 * Die Platte wird als flache Fläche mit den 100 Raster­öffnungen als Löchern
 * dargestellt (Preview-Charakter, exakte Maße stimmen mit der Referenz überein).
 */
export function Layout3DView({
  gridPitchMm = SYSTEM.gridPitchMm,
  wallThicknessMm = SYSTEM.wallThicknessMm,
  innerFloorRadiusMm = 2.5,
  outerClearanceMm = 0
}: {
  gridPitchMm?: number;
  wallThicknessMm?: number;
  innerFloorRadiusMm?: number;
  outerClearanceMm?: number;
}) {
  const boxes = useLayoutStore((s) => s.boxes);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const select = useLayoutStore((s) => s.select);

  const pitchMm = gridPitchMm;
  const plateW = SYSTEM.gridColumns * pitchMm;
  const plateD = SYSTEM.gridRows * pitchMm;
  const plateT = SYSTEM.pickupTopZMm * (pitchMm / SYSTEM.gridPitchMm);

  const plateGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(plateW, 0);
    shape.lineTo(plateW, plateD);
    shape.lineTo(0, plateD);
    shape.lineTo(0, 0);
    const openingSize = 18.69 * (pitchMm / SYSTEM.gridPitchMm);
    const openingR = 1.2;
    for (let i = 0; i < SYSTEM.gridColumns; i++) {
      for (let j = 0; j < SYSTEM.gridRows; j++) {
        const cx = (i + 0.5) * pitchMm;
        const cy = (j + 0.5) * pitchMm;
        const hole = new THREE.Path();
        drawRoundedRect(
          hole,
          cx - openingSize / 2,
          cy - openingSize / 2,
          openingSize,
          openingSize,
          openingR
        );
        shape.holes.push(hole);
      }
    }
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: plateT,
      bevelEnabled: false,
      curveSegments: 6
    });
    geom.computeVertexNormals();
    return geom;
  }, [plateW, plateD, plateT, pitchMm]);

  const centerX = plateW / 2;
  const centerY = plateD / 2;
  const centerZ = SYSTEM.defaultBoxHeightMm / 2;
  const radius = Math.max(plateW, plateD) * 1.2;

  return (
    <CadCanvas center={[centerX, centerY, centerZ]} radius={radius}>
      <mesh
        geometry={plateGeometry}
        position={[0, 0, -plateT]}
        onPointerDown={(e) => {
          e.stopPropagation();
          select(null);
        }}
      >
        <meshStandardMaterial color="#d6d1bf" metalness={0.05} roughness={0.85} />
      </mesh>
      {boxes.map((b) => {
        const w = b.widthCells * pitchMm;
        const d = b.depthCells * pitchMm;
        const h = b.heightMm;
        const isSel = b.id === selectedId;
        return (
          <group
            key={b.id}
            position={[b.x * pitchMm, b.y * pitchMm, 0.01]}
            onPointerDown={(e) => {
              e.stopPropagation();
              select(b.id);
            }}
          >
            <BoxMesh
              widthCells={b.widthCells}
              depthCells={b.depthCells}
              heightMm={b.heightMm}
              gridPitchMm={gridPitchMm}
              wallThicknessMm={wallThicknessMm}
              innerFloorRadiusMm={innerFloorRadiusMm}
              outerClearanceMm={outerClearanceMm}
              color={isSel ? "#4c8cff" : "#7fb0ff"}
              opacity={isSel ? 1 : 0.92}
            />
            {isSel && (
              <lineSegments
                position={[w / 2, d / 2, h / 2]}
                renderOrder={2}
              >
                <edgesGeometry
                  args={[new THREE.BoxGeometry(w + 0.4, d + 0.4, h + 0.4)]}
                />
                <lineBasicMaterial color="#ffffff" />
              </lineSegments>
            )}
          </group>
        );
      })}
    </CadCanvas>
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
