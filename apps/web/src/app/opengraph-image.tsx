import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SlotCrate Generator preview";
export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0d120d 0%, #1f3418 45%, #0f1f0a 100%)",
          color: "#f2f5f0",
          fontFamily: "Segoe UI"
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 640,
            padding: "54px 58px"
          }}
        >
          <div style={{ fontSize: 18, letterSpacing: "0.2em", opacity: 0.78, textTransform: "uppercase" }}>
            SlotCrate Sorting System
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 62, lineHeight: 1.04, fontWeight: 700 }}>Generator Preview</div>
            <div style={{ fontSize: 28, lineHeight: 1.35, color: "#d6dfd0" }}>
              Modular boxes, live dimensions, STL export.
            </div>
          </div>
          <div style={{ fontSize: 24, color: "#98eb4b" }}>slotcrate-sos-gen.i3ull3t.de</div>
        </div>

        <div
          style={{
            width: 560,
            padding: "42px 38px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 30,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(0,0,0,0.35)",
              display: "flex",
              flexDirection: "column",
              padding: 26,
              gap: 18
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 600 }}>Single Box</div>
              <div
                style={{
                  borderRadius: 999,
                  background: "linear-gradient(130deg, #5fbb2e, #7ed321)",
                  color: "#071007",
                  fontWeight: 700,
                  fontSize: 18,
                  padding: "8px 16px"
                }}
              >
                STL
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 18, color: "#cfd6cb" }}>Width 4 · Depth 3 · Height 26mm</div>
              <div style={{ height: 12, borderRadius: 999, background: "linear-gradient(90deg, #5fbb2e, #8ceb48)" }} />
            </div>

            <div
              style={{
                flex: 1,
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.12)",
                background:
                  "linear-gradient(rgba(95, 187, 46, 0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(95, 187, 46, 0.18) 1px, transparent 1px)",
                backgroundSize: "34px 34px",
                position: "relative",
                display: "flex"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 76,
                  top: 62,
                  width: 204,
                  height: 156,
                  borderRadius: 16,
                  border: "2px solid rgba(255,255,255,0.78)",
                  background: "rgba(126, 211, 33, 0.28)",
                  boxShadow: "0 0 26px rgba(126, 211, 33, 0.33)"
                }}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}