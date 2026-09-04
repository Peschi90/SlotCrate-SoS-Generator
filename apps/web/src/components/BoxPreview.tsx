"use client";

import { BoxMesh } from "./BoxMesh";
import { CadCanvas } from "./CadCanvas";
import { SYSTEM } from "@/lib/system";

interface Props {
  widthCells: number;
  depthCells: number;
  heightMm: number;
  scaleFactor?: number;
}

export function BoxPreview({ widthCells, depthCells, heightMm, scaleFactor = 1 }: Props) {
  const pitchMm = SYSTEM.gridPitchMm * scaleFactor;
  const outerW = widthCells * pitchMm;
  const outerD = depthCells * pitchMm;
  const centerX = outerW / 2;
  const centerY = outerD / 2;
  const scaledHeightMm = heightMm * scaleFactor;
  const centerZ = scaledHeightMm / 2;
  const radius = Math.max(outerW, outerD, scaledHeightMm) * 0.9;
  return (
    <CadCanvas center={[centerX, centerY, centerZ]} radius={radius}>
      <BoxMesh
        widthCells={widthCells}
        depthCells={depthCells}
        heightMm={heightMm}
        scaleFactor={scaleFactor}
      />
    </CadCanvas>
  );
}
