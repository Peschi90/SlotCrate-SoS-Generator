"""Zentrale, unveränderliche Systemkonstanten.

Diese Werte sind in der Referenzanalyse (docs/REFERENCE_GEOMETRY.md) belegt.
Sie dürfen weder im Frontend noch im Admin-Panel geändert werden.
"""
from __future__ import annotations

GEOMETRY_VERSION: str = "slotcrate-v1"

# Grundrasterplatte
GRID_COLUMNS: int = 10
GRID_ROWS: int = 10
GRID_PITCH_MM: float = 21.09
GRID_OPENING_MM: float = 18.69
GRID_STRUT_MM: float = 2.40
PLATE_MARGIN_WIDTH_MM: float = 1.40
PLATE_MARGIN_DEPTH_MM: float = 4.15
PLATE_THICKNESS_MM: float = 4.00
PLATE_OUTER_WIDTH_MM: float = 211.30
PLATE_OUTER_DEPTH_MM: float = 216.80

# Kasten-Standardwerte (vom Admin änderbar, siehe M9)
DEFAULT_BOX_HEIGHT_MM: float = 35.80
DEFAULT_WALL_THICKNESS_MM: float = 1.20
DEFAULT_INNER_FLOOR_RADIUS_MM: float = 2.50

# Bodenaufnahme aus Referenzanalyse (invariant):
# 1×1 hat 1 Aufnahme, 2×2 hat 4 gleiche Aufnahmen. Pro Aufnahme: 2 Zylinder + 1 Kegel.
# Zylinderradien: {2.50, 6.327}. Diese Werte werden in M2 zur Verifikation der
# extrahierten Feature-Signatur genutzt.
PICKUP_INNER_RADIUS_MM: float = 2.50
PICKUP_OUTER_RADIUS_MM: float = 6.327

# Höhe der Bodenaufnahme vom Kastenboden (verifiziert aus 2×2-Zerlegung).
# Bei 2×2 sind die vier Aufnahmen unterhalb dieser Z-Ebene topologisch getrennt.
PICKUP_TOP_Z_MM: float = 4.00
# Aus 2×2-Zerlegung: 18,49 × 18,49 × 4,00 mm, V ≈ 1053,03 mm³.
PICKUP_FOOTPRINT_MM: float = 18.49
PICKUP_VOLUME_MM3: float = 1053.03

# Bodendicke des Kastens (Referenz-2×2: Z=4,00 → Z=5,00).
DEFAULT_FLOOR_THICKNESS_MM: float = 1.00

# Toleranzen für Geometrietests
BBOX_TOLERANCE_MM: float = 0.02
VOLUME_TOLERANCE_PCT: float = 0.5
