"use client";

import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Environment
} from "@react-three/drei";
import * as THREE from "three";
import { useCallback, useEffect, useMemo, useState } from "react";

export type ViewPreset =
  | "iso"
  | "top"
  | "bottom"
  | "front"
  | "back"
  | "left"
  | "right";

interface Props {
  center?: [number, number, number];
  radius: number;
  showGrid?: boolean;
  showEnvironment?: boolean;
  children: React.ReactNode;
}

/**
 * CAD-artiges 3D-Viewport: Z-Up, Axis-Gizmo, XY-Grid, Ansichts­presets,
 * Perspektive mit OrbitControls. Der Inhalt wird zentriert um
 * `center` betrachtet und mit `radius` als Abstandsmaßstab platziert.
 */
export function CadCanvas({
  center = [0, 0, 0],
  radius,
  showGrid = true,
  showEnvironment = true,
  children
}: Props) {
  const [preset, setPreset] = useState<ViewPreset>("iso");
  const [seq, setSeq] = useState(0);
  const centerVec = useMemo(
    () => new THREE.Vector3(center[0], center[1], center[2]),
    [center[0], center[1], center[2]]
  );

  const selectView = useCallback((v: ViewPreset) => {
    setPreset(v);
    setSeq((s) => s + 1);
  }, []);

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{
          position: [radius, -radius, radius * 0.8],
          fov: 40,
          near: 0.1,
          far: radius * 20,
          up: [0, 0, 1]
        }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#0e1116"]} />
        <ambientLight intensity={0.35} />
        <hemisphereLight color="#e6ecff" groundColor="#20242c" intensity={0.5} />
        <directionalLight
          position={[radius * 1.5, -radius * 1.5, radius * 2]}
          intensity={0.9}
        />
        {showEnvironment && <Environment preset="city" background={false} />}
        {showGrid && (
          <Grid
            args={[radius * 6, radius * 6]}
            cellSize={SYSTEM_PITCH_MM}
            cellThickness={0.6}
            cellColor="#2a2f38"
            sectionSize={SYSTEM_PITCH_MM * 5}
            sectionThickness={1.2}
            sectionColor="#3b4252"
            fadeDistance={radius * 12}
            fadeStrength={1.2}
            infiniteGrid
            rotation={[Math.PI / 2, 0, 0]}
          />
        )}
        {children}
        <OrbitControls makeDefault target={centerVec.toArray()} enableDamping />
        <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
          <GizmoViewport
            axisColors={["#e2483b", "#3ea86a", "#4c8cff"]}
            labelColor="#0e1116"
          />
        </GizmoHelper>
        <ViewController preset={preset} seq={seq} center={centerVec} radius={radius} />
      </Canvas>
      <ViewToolbar current={preset} onSelect={selectView} />
      <ViewLegend />
    </div>
  );
}

// Rasterkonstante hier duplizieren, damit die Datei nicht auf den Store
// zurückgreifen muss (der Server-Component-Baum importiert sie sonst
// versehentlich mit).
const SYSTEM_PITCH_MM = 21.09;

const BUTTONS: readonly (readonly [ViewPreset, string])[] = [
  ["iso", "Iso"],
  ["top", "Oben"],
  ["bottom", "Unten"],
  ["front", "Vorn"],
  ["back", "Hinten"],
  ["left", "Links"],
  ["right", "Rechts"]
];

function ViewToolbar({
  current,
  onSelect
}: {
  current: ViewPreset;
  onSelect(v: ViewPreset): void;
}) {
  return (
    <div className="pointer-events-auto absolute top-2 left-2 flex flex-wrap gap-1 text-xs">
      {BUTTONS.map(([v, label]) => {
        const active = v === current;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            className={
              "px-2.5 py-1 rounded border transition " +
              (active
                ? "bg-crate-box text-neutral-900 border-white"
                : "bg-neutral-900/85 text-neutral-200 border-neutral-700 hover:border-neutral-400 backdrop-blur")
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ViewLegend() {
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 text-[10px] leading-tight text-neutral-400 bg-neutral-900/60 backdrop-blur rounded px-2 py-1">
      <div>
        <span className="text-[#e2483b]">X</span> Breite ·{" "}
        <span className="text-[#3ea86a]">Y</span> Tiefe ·{" "}
        <span className="text-[#4c8cff]">Z</span> Höhe
      </div>
      <div>LMB: drehen · Shift+LMB: schieben · Rad: zoomen</div>
    </div>
  );
}

function ViewController({
  preset,
  seq,
  center,
  radius
}: {
  preset: ViewPreset;
  seq: number;
  center: THREE.Vector3;
  radius: number;
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as
    | { target: THREE.Vector3; update(): void }
    | null;

  useEffect(() => {
    const pos = positionFor(preset, center, radius);
    camera.position.copy(pos);
    camera.up.set(0, 0, 1);
    camera.lookAt(center);
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
    // seq is intentionally in deps so repeated clicks re-apply the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, seq]);

  return null;
}

function positionFor(preset: ViewPreset, c: THREE.Vector3, r: number): THREE.Vector3 {
  const R = Math.max(r, 1);
  switch (preset) {
    case "top":
      return new THREE.Vector3(c.x, c.y, c.z + R * 2.2);
    case "bottom":
      return new THREE.Vector3(c.x, c.y, c.z - R * 2.2);
    case "front":
      return new THREE.Vector3(c.x, c.y - R * 2.2, c.z);
    case "back":
      return new THREE.Vector3(c.x, c.y + R * 2.2, c.z);
    case "right":
      return new THREE.Vector3(c.x + R * 2.2, c.y, c.z);
    case "left":
      return new THREE.Vector3(c.x - R * 2.2, c.y, c.z);
    case "iso":
    default:
      return new THREE.Vector3(c.x + R * 1.4, c.y - R * 1.4, c.z + R * 1.2);
  }
}
