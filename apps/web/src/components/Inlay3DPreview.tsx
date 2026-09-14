"use client";

import { CadCanvas } from "./CadCanvas";
import { InlayMesh } from "./InlayMesh";
import { SYSTEM } from "@/lib/system";
import type { InlayCutout } from "@/lib/schema";

interface Props {
  level1Cutouts: InlayCutout[];
  level2Cutouts: InlayCutout[];
  activeLevel?: 1 | 2;
  activeCutoutIndex?: number | null;
}

export function Inlay3DPreview({
  level1Cutouts,
  level2Cutouts,
  activeLevel,
  activeCutoutIndex
}: Props) {
  const centerX = SYSTEM.inlayWidthMm / 2;
  const centerY = SYSTEM.inlayDepthMm / 2;
  const centerZ = SYSTEM.inlayHeightMm / 2;
  const radius = Math.max(SYSTEM.inlayWidthMm, SYSTEM.inlayDepthMm, SYSTEM.inlayHeightMm) * 0.95;

  return (
    <CadCanvas center={[centerX, centerY, centerZ]} radius={radius}>
      <InlayMesh
        level1Cutouts={level1Cutouts}
        level2Cutouts={level2Cutouts}
        activeLevel={activeLevel}
        activeCutoutIndex={activeCutoutIndex}
      />
    </CadCanvas>
  );
}
