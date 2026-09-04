"use client";

import { BoxMesh } from "./BoxMesh";
import { CadCanvas } from "./CadCanvas";
import { SYSTEM } from "@/lib/system";

interface Props {
  widthCells: number;
  depthCells: number;
  heightMm: number;
  gridPitchMm?: number;
  wallThicknessMm?: number;
  innerFloorRadiusMm?: number;
  outerClearanceMm?: number;
}

export function BoxPreview({
  widthCells,
  depthCells,
  heightMm,
  gridPitchMm = SYSTEM.gridPitchMm,
  wallThicknessMm = SYSTEM.wallThicknessMm,
  innerFloorRadiusMm = 2.5,
  outerClearanceMm = 0
}: Props) {
  const pitchMm = gridPitchMm;
  const outerW = widthCells * pitchMm;
  const outerD = depthCells * pitchMm;
  const centerX = outerW / 2;
  const centerY = outerD / 2;
  const centerZ = heightMm / 2;
  const radius = Math.max(outerW, outerD, heightMm) * 0.9;
  return (
    <CadCanvas center={[centerX, centerY, centerZ]} radius={radius}>
      <BoxMesh
        widthCells={widthCells}
        depthCells={depthCells}
        heightMm={heightMm}
        gridPitchMm={gridPitchMm}
        wallThicknessMm={wallThicknessMm}
        innerFloorRadiusMm={innerFloorRadiusMm}
        outerClearanceMm={outerClearanceMm}
      />
    </CadCanvas>
  );
}
