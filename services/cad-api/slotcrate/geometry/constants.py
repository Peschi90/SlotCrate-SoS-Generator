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

# Unterteilungsstege (freie mm-Positionen, Dicke = Wandstärke).
# Untergrenze schützt vor entarteten Wänden, Obergrenze begrenzt Payload-Größe.
MIN_DIVIDER_OFFSET_MM: float = 0.1
MIN_DIVIDER_HEIGHT_MM: float = 1.0
MAX_DIVIDERS_PER_BOX: int = 32

# Runde Taschen (Becher/Rundwand, Wanddicke = wallThicknessMm).
# Innenboden = Kavitätsboden; Höhe = Wandhöhe des Bechers.
MIN_POCKET_DIAMETER_MM: float = 3.0
MAX_POCKET_DIAMETER_MM: float = 200.0
MIN_POCKET_HEIGHT_MM: float = 1.0
MAX_POCKETS_PER_BOX: int = 1000

# Wannen-Einsätze (Wellen-Einsatz): rechteckiger Sockel mit N parallelen
# rinnenförmigen Vertiefungen (Kreisbogen-Profil) für runde Werkzeuge.
MIN_WAVE_HEIGHT_MM: float = 2.0
MIN_WAVE_GROOVE_DIAMETER_MM: float = 4.0
MAX_WAVE_GROOVE_DIAMETER_MM: float = 80.0
MIN_WAVE_GROOVE_DEPTH_MM: float = 0.5
MIN_WAVE_GROOVE_COUNT: int = 1
MAX_WAVE_GROOVE_COUNT: int = 20
MAX_WAVE_INSERTS_PER_BOX: int = 16

# Maintenance-Modul Einschub (SC_MM_Inlay)
INLAY_STEP_FILE: str = "SC_MM_Inlay.step"
INLAY_WIDTH_MM: float = 57.40
INLAY_DEPTH_MM: float = 224.60
INLAY_HEIGHT_MM: float = 215.40
# Ebene 1 (unten, breiter): X=[3.70, 53.70], Y=[4.50, 224.60], Z=26.50..28.60
INLAY_LEVEL1_SHELF_X_MIN_MM: float = 3.70
INLAY_LEVEL1_SHELF_X_MAX_MM: float = 53.70
INLAY_LEVEL1_SHELF_Y_MIN_MM: float = 4.50
INLAY_LEVEL1_SHELF_Y_MAX_MM: float = 224.60
INLAY_LEVEL1_MAX_CUTOUT_DIAMETER_MM: float = 42.00
# Ebene 2 (oben, Standard): X=[8.00, 49.40], Y=[4.50, 221.70], Z=127.30..128.90
INLAY_LEVEL2_SHELF_X_MIN_MM: float = 8.00
INLAY_LEVEL2_SHELF_X_MAX_MM: float = 49.40
INLAY_LEVEL2_SHELF_Y_MIN_MM: float = 4.50
INLAY_LEVEL2_SHELF_Y_MAX_MM: float = 221.70
INLAY_LEVEL2_MAX_CUTOUT_DIAMETER_MM: float = 36.20

# Globale Standard-/Grenzwerte
INLAY_SHELF_USABLE_X_MIN_MM: float = 3.70
INLAY_SHELF_USABLE_X_MAX_MM: float = 53.70
INLAY_SHELF_USABLE_Y_MIN_MM: float = 4.50
INLAY_SHELF_USABLE_Y_MAX_MM: float = 224.60
INLAY_CENTER_X_MM: float = 28.70
INLAY_MIN_MARGIN_MM: float = 2.60
INLAY_MIN_HOLE_SPACING_MM: float = 2.60
INLAY_MIN_CUTOUT_DIAMETER_MM: float = 5.0
INLAY_MAX_CUTOUT_DIAMETER_MM: float = 42.00
INLAY_MAX_CUTOUTS_PER_LEVEL: int = 50
INLAY_LEVEL1_SHELF_Z_MM: float = 28.60
INLAY_LEVEL2_SHELF_Z_MM: float = 128.90

# Slotcar-Modul Cover (SC_SM_Cover)
COVER_STEP_FILE: str = "SC_SM_Cover.step"
COVER_WIDTH_MM: float = 116.0
COVER_DEPTH_MM: float = 216.0
COVER_HEIGHT_MM: float = 3.0
COVER_GROOVE_DEPTH_MM: float = 0.2
COVER_GROOVE_WIDTH_MM: float = 0.8
COVER_EDGE_MARGIN_MM: float = 8.0
COVER_MIN_FONT_SIZE_MM: float = 6.0
COVER_MAX_FONT_SIZE_MM: float = 30.0
COVER_MAX_TEXT_LENGTH: int = 24

# Toleranzen für Geometrietests
BBOX_TOLERANCE_MM: float = 0.02
VOLUME_TOLERANCE_PCT: float = 0.5
