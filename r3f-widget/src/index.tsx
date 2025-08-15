// r3f-widget/src/index.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import SeaweedDataGarden from "./data-const-widget";

export type SeaweedProps = React.ComponentProps<typeof SeaweedDataGarden>;
export const __sdgVersion = "2.0.0";

export function mountSeaweed(
  el: HTMLElement,
  props: Partial<SeaweedProps> = {}
) {
  const root = createRoot(el);
  (el as any).__sdgRoot = root;
  root.render(<SeaweedDataGarden {...props} />);
}

export function unmountSeaweed(el: HTMLElement) {
  const root = (el as any).__sdgRoot as import("react-dom/client").Root | undefined;
  root?.unmount();
}
