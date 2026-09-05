"""M4: Contract-Tests der CAD-API mit dem FastAPI-TestClient."""
from __future__ import annotations

import io
import json
import zipfile
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path, monkeypatch) -> TestClient:
    monkeypatch.setenv("CAD_API_CACHE_DIR", str(tmp_path / "cache"))
    monkeypatch.delenv("CAD_API_INTERNAL_TOKEN", raising=False)
    from app.main import create_app

    return TestClient(create_app())


@pytest.fixture()
def secured_client(tmp_path, monkeypatch) -> TestClient:
    monkeypatch.setenv("CAD_API_CACHE_DIR", str(tmp_path / "cache"))
    monkeypatch.setenv("CAD_API_INTERNAL_TOKEN", "test-token")
    from app.main import create_app

    return TestClient(create_app())


def test_health(client: TestClient) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["geometryVersion"] == "slotcrate-v1"


def test_active_settings_exposes_invariants(client: TestClient) -> None:
    r = client.get("/v1/settings/active")
    assert r.status_code == 200
    body = r.json()
    assert body["geometryVersion"] == "slotcrate-v1"
    assert body["grid"] == {"columns": 10, "rows": 10, "pitch": 21.09}
    assert body["box"]["defaultHeightMm"] == 35.8
    assert body["limits"]["maxCells"] == 10


def test_box_stl_returns_binary_and_hits_cache(client: TestClient) -> None:
    payload = {"widthCells": 1, "depthCells": 1}
    r1 = client.post("/v1/box/stl", json=payload)
    assert r1.status_code == 200
    assert r1.headers["content-type"] == "model/stl"
    assert len(r1.content) > 1024
    key1 = r1.headers["x-slotcrate-cache-key"]

    r2 = client.post("/v1/box/stl", json=payload)
    assert r2.status_code == 200
    assert r2.content == r1.content
    assert r2.headers["x-slotcrate-cache-key"] == key1


def test_box_stl_rejects_out_of_range(client: TestClient) -> None:
    r = client.post("/v1/box/stl", json={"widthCells": 0, "depthCells": 1})
    assert r.status_code == 422
    r = client.post("/v1/box/stl", json={"widthCells": 1, "depthCells": 11})
    assert r.status_code == 422
    r = client.post("/v1/box/stl", json={"widthCells": 1, "depthCells": 1, "heightMm": 5.0})
    assert r.status_code == 422


def test_box_stl_rejects_extra_fields(client: TestClient) -> None:
    r = client.post(
        "/v1/box/stl",
        json={"widthCells": 1, "depthCells": 1, "hackFlag": True},
    )
    assert r.status_code == 422


def test_layout_zip_deduplicates_stls(client: TestClient) -> None:
    boxes = [
        {"id": str(uuid4()), "x": 0, "y": 0, "widthCells": 1, "depthCells": 1},
        {"id": str(uuid4()), "x": 1, "y": 0, "widthCells": 1, "depthCells": 1},
        {"id": str(uuid4()), "x": 0, "y": 1, "widthCells": 2, "depthCells": 2},
    ]
    r = client.post(
        "/v1/layout/zip",
        json={
            "boxes": boxes,
            "suitcaseVariantId": "sc-124-v2",
            "plateStepFile": "SlotCrate.step",
        },
    )
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/zip"
    with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
        names = set(zf.namelist())
        stl_files = {n for n in names if n.startswith("models/") and n.endswith(".stl")}
        assert len(stl_files) == 3  # 1×1, 2×2 + kofferabhängige Rasterplatte aus Referenz
        assert "models/sc-124-v2_Rasterplatte_SlotCrate.stl" in stl_files
        assert "configuration.json" in names
        assert "parts-list.csv" in names
        assert "README.txt" in names
        csv_content = zf.read("parts-list.csv").decode("utf-8")
        readme_content = zf.read("README.txt").decode("utf-8")
        assert "1x1" in csv_content
        assert ",2\n" in csv_content or ",2\r\n" in csv_content  # zwei 1×1
        assert "Danke, dass du SlotCrate verwendest." in readme_content
        assert "Thank you for using SlotCrate." in readme_content
        assert "https://slotcrate.i3ull3t.de" in readme_content
        assert "https://makerworld.com/de/@I3uLL3t" in readme_content
        assert "https://www.freeslotter.de/index.php?thread/108860-slotcrate-3d-druck-slotkoffer/" in readme_content
        assert "https://i3ull3t.de" in readme_content
        assert "https://www.paypal.com/paypalme/i3ull3t" in readme_content


def test_layout_zip_rejects_overlap(client: TestClient) -> None:
    boxes = [
        {"id": str(uuid4()), "x": 0, "y": 0, "widthCells": 2, "depthCells": 2},
        {"id": str(uuid4()), "x": 1, "y": 1, "widthCells": 2, "depthCells": 2},
    ]
    r = client.post("/v1/layout/zip", json={"boxes": boxes})
    assert r.status_code == 422


def test_layout_zip_rejects_out_of_grid(client: TestClient) -> None:
    boxes = [
        {"id": str(uuid4()), "x": 9, "y": 0, "widthCells": 2, "depthCells": 1},
    ]
    r = client.post("/v1/layout/zip", json={"boxes": boxes})
    assert r.status_code == 422


def test_layout_zip_rejects_pitch_tampering(client: TestClient) -> None:
    r = client.post(
        "/v1/layout/zip",
        json={"boxes": [], "grid": {"columns": 10, "rows": 10, "pitch": 20.0}},
    )
    assert r.status_code == 422


def test_secured_endpoints_require_bearer(secured_client: TestClient) -> None:
    r = secured_client.post("/v1/box/stl", json={"widthCells": 1, "depthCells": 1})
    assert r.status_code == 401
    r = secured_client.post(
        "/v1/box/stl",
        json={"widthCells": 1, "depthCells": 1},
        headers={"Authorization": "Bearer wrong"},
    )
    assert r.status_code == 403
    r = secured_client.post(
        "/v1/box/stl",
        json={"widthCells": 1, "depthCells": 1},
        headers={"Authorization": "Bearer test-token"},
    )
    assert r.status_code == 200


def test_plate_stl_returns_binary_and_hits_cache(client: TestClient) -> None:
    payload = {"plateStepFile": "SlotCrate.step", "suitcaseVariantId": "sc-124-v2"}
    r1 = client.post("/v1/plate/stl", json=payload)
    assert r1.status_code == 200, r1.text
    assert r1.headers["content-type"] == "model/stl"
    assert len(r1.content) > 1024
    assert "sc-124-v2_Rasterplatte_SlotCrate.stl" in r1.headers["content-disposition"]
    key1 = r1.headers["x-slotcrate-cache-key"]

    r2 = client.post("/v1/plate/stl", json=payload)
    assert r2.status_code == 200
    assert r2.content == r1.content
    assert r2.headers["x-slotcrate-cache-key"] == key1


def test_plate_stl_rejects_extra_fields_and_bad_names(client: TestClient) -> None:
    r = client.post("/v1/plate/stl", json={"plateStepFile": "SlotCrate.step", "hackFlag": True})
    assert r.status_code == 422
    r = client.post("/v1/plate/stl", json={"plateStepFile": "../etc/passwd"})
    assert r.status_code == 422
    r = client.post("/v1/plate/stl", json={"plateStepFile": "SlotCrate.step", "suitcaseVariantId": "Bad_ID"})
    assert r.status_code == 422


def test_plate_stl_returns_400_for_missing_step_file(client: TestClient) -> None:
    r = client.post("/v1/plate/stl", json={"plateStepFile": "Missing.step"})
    assert r.status_code == 400
    body = r.json()
    assert body["error"] == "PLATE_STEP_NOT_AVAILABLE"
