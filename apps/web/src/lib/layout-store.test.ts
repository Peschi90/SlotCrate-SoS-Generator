import { beforeEach, describe, expect, it } from "vitest";
import { useLayoutStore } from "./layout-store";

function resetStore() {
  useLayoutStore.setState({
    boxes: [],
    selectedId: null,
    past: [],
    future: [],
    selectedHeightMm: 35.8
  });
}

describe("layout store", () => {
  beforeEach(() => resetStore());

  it("adds a valid box and selects it", () => {
    const box = useLayoutStore.getState().addBox(0, 0, 2, 2);
    expect(box).not.toBeNull();
    expect(useLayoutStore.getState().boxes).toHaveLength(1);
    expect(useLayoutStore.getState().selectedId).toBe(box!.id);
  });

  it("rejects overlapping placement", () => {
    useLayoutStore.getState().addBox(0, 0, 2, 2);
    const clash = useLayoutStore.getState().addBox(1, 1, 2, 2);
    expect(clash).toBeNull();
    expect(useLayoutStore.getState().boxes).toHaveLength(1);
  });

  it("rejects boxes that leave the grid", () => {
    const oob = useLayoutStore.getState().addBox(9, 0, 2, 1);
    expect(oob).toBeNull();
  });

  it("undo and redo restore history", () => {
    const a = useLayoutStore.getState().addBox(0, 0, 1, 1);
    const b = useLayoutStore.getState().addBox(2, 2, 1, 1);
    expect(useLayoutStore.getState().boxes).toHaveLength(2);
    useLayoutStore.getState().undo();
    expect(useLayoutStore.getState().boxes).toHaveLength(1);
    useLayoutStore.getState().undo();
    expect(useLayoutStore.getState().boxes).toHaveLength(0);
    useLayoutStore.getState().redo();
    expect(useLayoutStore.getState().boxes).toHaveLength(1);
    useLayoutStore.getState().redo();
    expect(useLayoutStore.getState().boxes).toHaveLength(2);
    expect(useLayoutStore.getState().boxes.map((x) => x.id)).toEqual([a!.id, b!.id]);
  });

  it("move respects collisions and grid bounds", () => {
    const a = useLayoutStore.getState().addBox(0, 0, 2, 2)!;
    useLayoutStore.getState().addBox(4, 4, 1, 1);
    expect(useLayoutStore.getState().moveBox(a.id, 4, 4)).toBe(false);
    expect(useLayoutStore.getState().moveBox(a.id, 9, 0)).toBe(false);
    expect(useLayoutStore.getState().moveBox(a.id, 6, 0)).toBe(true);
    expect(useLayoutStore.getState().boxes.find((b) => b.id === a.id)?.x).toBe(6);
  });

  it("remove clears selection when the removed box was selected", () => {
    const a = useLayoutStore.getState().addBox(0, 0, 1, 1)!;
    useLayoutStore.getState().select(a.id);
    useLayoutStore.getState().removeBox(a.id);
    expect(useLayoutStore.getState().selectedId).toBeNull();
  });

  it("reset removes all boxes and is undoable", () => {
    useLayoutStore.getState().addBox(0, 0, 1, 1);
    useLayoutStore.getState().addBox(3, 3, 2, 2);
    useLayoutStore.getState().reset();
    expect(useLayoutStore.getState().boxes).toHaveLength(0);
    useLayoutStore.getState().undo();
    expect(useLayoutStore.getState().boxes).toHaveLength(2);
  });

  it("canPlace ignores the given box id", () => {
    const a = useLayoutStore.getState().addBox(0, 0, 2, 2)!;
    expect(useLayoutStore.getState().canPlace(0, 0, 2, 2)).toBe(false);
    expect(useLayoutStore.getState().canPlace(0, 0, 2, 2, a.id)).toBe(true);
  });
});
