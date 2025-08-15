import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import SeaweedDataGarden from "./data-const-widget";

type Props = {
  height?: number;
  rounded?: boolean;
  background?: string;
  scale?: number;
  offsetY?: number;
  camera?: { position?: [number, number, number]; fov?: number };
};

const roots = new WeakMap<Element, Root>();

export function mountSeaweed(el: HTMLElement, props: Props = {}) {
  const root = createRoot(el);
  roots.set(el, root);
  root.render(<SeaweedDataGarden {...props} />);
}

export function unmountSeaweed(el: HTMLElement) {
  const root = roots.get(el);
  root?.unmount();
  roots.delete(el);
}
