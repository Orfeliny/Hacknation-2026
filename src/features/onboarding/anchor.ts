export type Rect = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Side = "top" | "bottom" | "left" | "right";

// `side` is where the dialog sits relative to the target; the pointer is on the opposite edge.
export type Placement = {
  top: number;
  left: number;
  side: Side;
  // Distance of the pointer tip from the dialog's top (side left/right) or left (side top/bottom) edge.
  pointerOffset: number;
};

export const GAP = 16;
export const MARGIN = 8;
const POINTER_INSET = 24;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export function placeCallout(
  target: Rect,
  dialog: Size,
  viewport: Size,
): Placement {
  const centerX = target.left + target.width / 2;
  const centerY = target.top + target.height / 2;

  const horizontal = (side: "top" | "bottom"): Placement => {
    const left = clamp(
      centerX - dialog.width / 2,
      MARGIN,
      viewport.width - dialog.width - MARGIN,
    );
    const top =
      side === "bottom"
        ? target.top + target.height + GAP
        : target.top - GAP - dialog.height;
    return {
      top,
      left,
      side,
      pointerOffset: clamp(
        centerX - left,
        POINTER_INSET,
        dialog.width - POINTER_INSET,
      ),
    };
  };

  const vertical = (side: "left" | "right"): Placement => {
    const top = clamp(
      centerY - dialog.height / 2,
      MARGIN,
      viewport.height - dialog.height - MARGIN,
    );
    const left =
      side === "right"
        ? target.left + target.width + GAP
        : target.left - GAP - dialog.width;
    return {
      top,
      left,
      side,
      pointerOffset: clamp(
        centerY - top,
        POINTER_INSET,
        dialog.height - POINTER_INSET,
      ),
    };
  };

  const bottom = horizontal("bottom");
  const candidates = [
    bottom,
    vertical("right"),
    horizontal("top"),
    vertical("left"),
  ];
  const fits = (p: Placement) =>
    p.top >= MARGIN &&
    p.left >= MARGIN &&
    p.top + dialog.height <= viewport.height - MARGIN &&
    p.left + dialog.width <= viewport.width - MARGIN;

  return candidates.find(fits) ?? bottom;
}
