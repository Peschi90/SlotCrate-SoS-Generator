"use client";

import { BoxMesh } from "./BoxMesh";
import { CadCanvas } from "./CadCanvas";
import { SYSTEM } from "@/lib/system";

interface Props {
  widthCells: number;
  depthCells: number;
  heightMm: number;
}

export function BoxPreview({ widthCells, depthCells, heightMm }: Props) {
  const outerW = widthCells * SYSTEM.gridPitchMm;
  const outerD = depthCells * SYSTEM.gridPitchMm;
  const centerX = outerW / 2;
  const centerY = outerD / 2;
  const centerZ = heightMm / 2;
  const radius = Math.max(outerW, outerD, heightMm) * 0.9;
  return (
    <CadCanvas center={[centerX, centerY, centerZ]} radius={radius}>
      <BoxMesh widthCells={widthCells} depthCells={depthCells} heightMm={heightMm} />
    </CadCanvas>
  );
}
