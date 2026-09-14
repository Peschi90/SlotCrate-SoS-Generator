"use client";

import { BoxMesh } from "./BoxMesh";
import { CadCanvas } from "./CadCanvas";
import { SYSTEM } from "@/lib/system";
import type { Divider, Pocket, WaveInsert } from "@/lib/schema";

interface Props {
  widthCells: number;
  depthCells: number;
  heightMm: number;
  gridPitchMm?: number;
  wallThicknessMm?: number;
  innerFloorRadiusMm?: number;
  outerClearanceMm?: number;
  dividers?: Divider[];
  pockets?: Pocket[];
  pocketsFillOuter?: boolean;
  waveInserts?: WaveInsert[];
  activeDividerIndex?: number | null;
  activePocketIndex?: number | null;
  activeWaveInsertIndex?: number | null;
  onDividerChange?: (index: number, patch: Partial<Divider>) => void;
  onPocketChange?: (index: number, patch: Partial<Pocket>) => void;
  onDividerActivate?: (index: number) => void;
  onPocketActivate?: (index: number) => void;
  onWaveInsertActivate?: (index: number) => void;
}

export function BoxPreview({
  widthCells,
  depthCells,
  heightMm,
  gridPitchMm = SYSTEM.gridPitchMm,
  wallThicknessMm = SYSTEM.wallThicknessMm,
  innerFloorRadiusMm = 2.5,
  outerClearanceMm = 0,
  dividers = [],
  pockets = [],
  pocketsFillOuter = false,
  waveInserts = [],
  activeDividerIndex = null,
  activePocketIndex = null,
  activeWaveInsertIndex = null,
  onDividerChange,
  onPocketChange,
  onDividerActivate,
  onPocketActivate,
  onWaveInsertActivate
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
        dividers={dividers}
        pockets={pockets}
        pocketsFillOuter={pocketsFillOuter}
        waveInserts={waveInserts}
        activeDividerIndex={activeDividerIndex}
        activePocketIndex={activePocketIndex}
        activeWaveInsertIndex={activeWaveInsertIndex}
        onDividerChange={onDividerChange}
        onPocketChange={onPocketChange}
        onDividerActivate={onDividerActivate}
        onPocketActivate={onPocketActivate}
        onWaveInsertActivate={onWaveInsertActivate}
      />
    </CadCanvas>
  );
}
