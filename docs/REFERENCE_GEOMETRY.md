# Referenzgeometrie SlotCrate

Automatisch erzeugt durch `scripts/analyze_reference_steps.py`.

Die Referenzdateien werden **nicht** verändert.


## Sollwerte (Auftrag)

- **SlotCrate.step**: 211.3 × 216.8 × 4.0 mm, Volumen –, Solids 1
- **SlotCrate_1x1.step**: 21.09 × 21.09 × 35.8 mm, Volumen 4232.88 mm³, Solids 1
- **SlotCrate_2x2.step**: 42.18 × 42.18 × 35.8 mm, Volumen 12174.15 mm³, Solids 1

## Ist-Werte

### SlotCrate.step

- Bounding Box (sortiert): 4.0 × 211.3 × 216.8 mm  (OK)
- Bounding Box (min → max): (118.5, 140.7, 10.2) → (329.8, 144.7, 227.0)
- Volumen: 43512.92 mm³  (OK)
- Oberfläche: 55085.26 mm²
- Solids: 1
- Flächen gesamt: 406
  - Plane: 406
- Schwerpunkt: (224.15, 142.7, 118.6)

### SlotCrate_1x1.step

- Bounding Box (sortiert): 21.09 × 21.09 × 35.8 mm  (OK)
- Bounding Box (min → max): (181.97, 100.7, 160.78) → (203.06, 136.5, 181.87)
- Volumen: 4232.88 mm³  (OK)
- Oberfläche: 6116.663 mm²
- Solids: 1
- Flächen gesamt: 40
  - Cone: 1
  - Cylinder: 5
  - Plane: 34
- Zylinderradien (sortiert, einzigartig): [2.5, 6.327]
- Schwerpunkt: (192.515, 115.819, 171.307)

### SlotCrate_2x2.step

- Bounding Box (sortiert): 35.8 × 42.18 × 42.18 mm  (OK)
- Bounding Box (min → max): (118.7, 100.7, 181.87) → (160.88, 136.5, 224.05)
- Volumen: 12174.154 mm³  (OK)
- Oberfläche: 14753.842 mm²
- Solids: 1
- Flächen gesamt: 99
  - Cone: 4
  - Cylinder: 8
  - Plane: 87
- Zylinderradien (sortiert, einzigartig): [2.5, 6.327]
- Schwerpunkt: (139.79, 112.38, 202.96)

## Abgeleitete Systemgrößen

- Rasterteilung: 21,09 mm (aus Kastenaußenmaß 1×1)
- Freie Rasteröffnung ≈ 18,69 × 18,69 mm (Sollwert Auftrag)
- Rastersteg 2,40 mm, Randbreite 1,40 mm, Randtiefe 4,15 mm (Sollwert)
- Wandstärke Kasten 1,20 mm (Sollwert – wird in M1 aus Referenz verifiziert)
