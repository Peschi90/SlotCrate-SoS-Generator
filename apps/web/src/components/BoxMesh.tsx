"use client";

import * as THREE from "three";
import { useCallback, useMemo, useRef } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
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
  color?: string;
  opacity?: number;
  cornerRadiusMm?: number;
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
  onDragStart?: () => void;
  onDragEnd?: () => void;
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
  pocketsFillOuter = false,
  waveInserts = [],
  activeDividerIndex = null,
  activePocketIndex = null,
  activeWaveInsertIndex = null,
  onDividerChange,
  onPocketChange,
  onDividerActivate,
  onPocketActivate,
  onWaveInsertActivate,
  onDragStart,
  onDragEnd
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

  const groupRef = useRef<THREE.Group>(null);
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const dragPlaneRef = useRef(new THREE.Plane());
  const dragPointRef = useRef(new THREE.Vector3());
  const dragStateRef = useRef<
    { kind: "divider" | "pocket"; index: number } | null
  >(null);

  const beginDragPlane = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;
    const origin = new THREE.Vector3(0, 0, pickupTop + floorT);
    group.localToWorld(origin);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(group.matrixWorld);
    dragPlaneRef.current.setFromNormalAndCoplanarPoint(normal, origin);
  }, [pickupTop, floorT]);

  const computeLocalXY = useCallback(
    (event: ThreeEvent<PointerEvent>): { x: number; y: number } | null => {
      const group = groupRef.current;
      if (!group) return null;
      const hit = event.ray.intersectPlane(dragPlaneRef.current, dragPointRef.current);
      if (!hit) return null;
      const local = group.worldToLocal(hit.clone());
      return { x: local.x, y: local.y };
    },
    []
  );

  const startDrag = useCallback(
    (kind: "divider" | "pocket", index: number, event: ThreeEvent<PointerEvent>) => {
      if (!event.altKey || event.button !== 0) return;
      event.stopPropagation();
      (event.target as { setPointerCapture?: (id: number) => void }).setPointerCapture?.(
        event.pointerId
      );
      beginDragPlane();
      dragStateRef.current = { kind, index };
      if (controls) controls.enabled = false;
      if (kind === "divider") onDividerActivate?.(index);
      else onPocketActivate?.(index);
      onDragStart?.();
    },
    [beginDragPlane, controls, onDragStart, onDividerActivate, onPocketActivate]
  );

  const moveDrag = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const xy = computeLocalXY(event);
      if (!xy) return;
      const halfT = wall / 2;
      if (drag.kind === "divider") {
        const d = dividers[drag.index];
        if (!d) return;
        if (d.axis === "x") {
          const clamped = clampNum(xy.x, halfT, Math.max(halfT, innerW - halfT));
          onDividerChange?.(drag.index, { offsetMm: round2(clamped) });
        } else {
          const clamped = clampNum(xy.y, halfT, Math.max(halfT, innerD - halfT));
          onDividerChange?.(drag.index, { offsetMm: round2(clamped) });
        }
      } else {
        const p = pockets[drag.index];
        if (!p) return;
        const r = p.diameterMm / 2;
        const cx = clampNum(xy.x, r, Math.max(r, innerW - r));
        const cy = clampNum(xy.y, r, Math.max(r, innerD - r));
        onPocketChange?.(drag.index, { centerXMm: round2(cx), centerYMm: round2(cy) });
      }
    },
    [computeLocalXY, dividers, pockets, wall, innerW, innerD, onDividerChange, onPocketChange]
  );

  const endDrag = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!dragStateRef.current) return;
      (event.target as { releasePointerCapture?: (id: number) => void }).releasePointerCapture?.(
        event.pointerId
      );
      dragStateRef.current = null;
      if (controls) controls.enabled = true;
      onDragEnd?.();
    },
    [controls, onDragEnd]
  );

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

  const pocketsMaxHeight = useMemo(
    () => pockets.reduce((m, p) => Math.max(m, p.heightMm), 0),
    [pockets]
  );

  return (
    <group ref={groupRef}>
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
        const isActive = idx === activeDividerIndex;
        return (
          <group key={`div-${idx}`}>
            <mesh
              position={[cx, cy, cz]}
              onPointerDown={(e) => startDrag("divider", idx, e)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
            >
              <boxGeometry args={[dimX, dimY, eff]} />
              <meshStandardMaterial
                color={isActive ? "#ffb020" : color}
                emissive={isActive ? "#7a4a00" : "#000000"}
                metalness={0.15}
                roughness={0.6}
                transparent={opacity < 1}
                opacity={opacity}
              />
            </mesh>
            {isActive && (
              <lineSegments position={[cx, cy, cz]} renderOrder={3}>
                <edgesGeometry
                  args={[new THREE.BoxGeometry(dimX + 0.3, dimY + 0.3, eff + 0.3)]}
                />
                <lineBasicMaterial color="#ffb020" />
              </lineSegments>
            )}
          </group>
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
            color={idx === activePocketIndex ? "#ffb020" : color}
            opacity={opacity}
          />
        ))
      )}
      {activePocketIndex !== null && pockets[activePocketIndex] && (
        <PocketHighlightRing
          pocket={pockets[activePocketIndex]!}
          wall={wall}
          topZ={
            pocketsFillOuter
              ? pickupTop + floorT + Math.min(cavityH, pocketsMaxHeight)
              : pickupTop + floorT + Math.min(Math.max(0, pockets[activePocketIndex]!.heightMm), cavityH)
          }
        />
      )}
      {pockets.map((p, idx) => {
        // Voller Deckel-Kreis als Klickziel: deckt Ring UND Innenfläche ab,
        // unabhängig vom Rahmen-/Fill-Modus (dort ist die Deckhöhe einheitlich).
        const topZ = pocketsFillOuter
          ? pickupTop + floorT + Math.min(cavityH, pocketsMaxHeight)
          : pickupTop + floorT + Math.min(Math.max(0, p.heightMm), cavityH);
        if (topZ <= pickupTop + floorT) return null;
        return (
          <mesh
            key={`pockethit-${idx}`}
            visible={false}
            position={[wall + p.centerXMm, wall + p.centerYMm, topZ + 0.05]}
            onPointerDown={(e) => startDrag("pocket", idx, e)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
          >
            <circleGeometry args={[p.diameterMm / 2 + wall, 24]} />
            <meshBasicMaterial />
          </mesh>
        );
      })}
      {waveInserts.map((w, idx) => (
        <WaveInsertMesh
          key={`wave-${idx}`}
          insert={w}
          innerW={innerW}
          innerD={innerD}
          wall={wall}
          cavityH={cavityH}
          baseZ={pickupTop + floorT}
          color={idx === activeWaveInsertIndex ? "#ffb020" : color}
          opacity={opacity}
          isActive={idx === activeWaveInsertIndex}
          onActivate={() => onWaveInsertActivate?.(idx)}
        />
      ))}
    </group>
  );
}

interface PocketHighlightRingProps {
  pocket: Pocket;
  wall: number;
  topZ: number;
}

function PocketHighlightRing({ pocket, wall, topZ }: PocketHighlightRingProps) {
  const outerR = pocket.diameterMm / 2 + wall;
  return (
    <mesh
      position={[wall + pocket.centerXMm, wall + pocket.centerYMm, topZ + 0.08]}
      renderOrder={3}
    >
      <ringGeometry args={[outerR * 0.9, outerR * 1.2, 32]} />
      <meshBasicMaterial color="#ffb020" side={THREE.DoubleSide} transparent opacity={0.9} />
    </mesh>
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
    const innerR = pocket.diameterMm / 2;
    const outerR = innerR + wall;
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
      const innerR = p.diameterMm / 2;
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

interface WaveInsertMeshProps {
  insert: WaveInsert;
  innerW: number;
  innerD: number;
  wall: number;
  cavityH: number;
  baseZ: number;
  color: string;
  opacity: number;
  isActive: boolean;
  onActivate?: () => void;
}

/**
 * Wannen-Einsatz-Vorschau: massiver Block mit wellenförmiger Oberseite
 * (kreisbogenförmige Rinnen). Profil wird in (u, Höhe) aufgebaut und
 * entlang der Spannweiten-Achse extrudiert; anschließend je nach Achse
 * ausgerichtet (siehe Herleitung: rotateX(-90°) [+ rotateZ(90°) für Achse Y]).
 */
function WaveInsertMesh({
  insert,
  innerW,
  innerD,
  wall,
  cavityH,
  baseZ,
  color,
  opacity,
  isActive,
  onActivate
}: WaveInsertMeshProps) {
  const eff = Math.min(Math.max(0, insert.heightMm), cavityH);
  const blockSpan = insert.grooveCount * insert.grooveDiameterMm;
  const halfSpan = blockSpan / 2;
  const spanLen = insert.axis === "x" ? innerD : innerW;

  const geometry = useMemo(() => {
    if (eff <= 0 || blockSpan <= 0 || spanLen <= 0) return null;
    const R = insert.grooveDiameterMm / 2;
    const depth = Math.min(insert.grooveDepthMm, R, eff);
    const halfW = Math.sqrt(Math.max(0, 2 * R * depth - depth * depth));
    const zTop = eff;
    const Zc = zTop + (R - depth);
    const angleLeft = Math.atan2(zTop - Zc, -halfW);
    const angleRight = Math.atan2(zTop - Zc, halfW);

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, -zTop);
    for (let i = 0; i < insert.grooveCount; i++) {
      const center = R + i * insert.grooveDiameterMm;
      const leftChord = center - halfW;
      const rightChord = center + halfW;
      shape.lineTo(leftChord, -zTop);
      if (halfW > 0.0001) {
        shape.absarc(center, -Zc, R, -angleLeft, -angleRight, true);
      } else {
        shape.lineTo(rightChord, -zTop);
      }
    }
    shape.lineTo(blockSpan, -zTop);
    shape.lineTo(blockSpan, 0);
    shape.lineTo(0, 0);

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: spanLen,
      bevelEnabled: false,
      curveSegments: 16
    });
    geom.rotateX(-Math.PI / 2);
    if (insert.axis === "y") {
      geom.rotateZ(Math.PI / 2);
      geom.translate(spanLen, 0, 0);
    }
    geom.computeVertexNormals();
    return geom;
  }, [insert.axis, insert.grooveCount, insert.grooveDiameterMm, insert.grooveDepthMm, eff, blockSpan, spanLen]);

  if (!geometry) return null;

  const position: [number, number, number] =
    insert.axis === "x"
      ? [wall + insert.offsetMm - halfSpan, wall, baseZ]
      : [wall, wall + insert.offsetMm - halfSpan, baseZ];

  return (
    <group>
      <mesh position={position} geometry={geometry} onPointerDown={onActivate}>
        <meshStandardMaterial
          color={color}
          metalness={0.15}
          roughness={0.6}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {isActive && (
        <lineSegments position={position} renderOrder={3}>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#ffb020" />
        </lineSegments>
      )}
    </group>
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

function clampNum(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
