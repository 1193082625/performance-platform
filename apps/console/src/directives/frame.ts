import type { Directive } from "vue";

const SVG_NS = "http://www.w3.org/2000/svg";
const cleanups = new WeakMap<HTMLElement, () => void>();

// Pixel-based corners and non-scaling strokes; long edges follow the container.
export const frame: Directive<HTMLElement> = {
  mounted(element) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "frame-decoration");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const classes = [
      "frame-surface",
      "frame-outline",
      "frame-inset",
      "frame-leading",
      "frame-trailing",
      "frame-traces",
    ];
    const paths = classes.map((className) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("class", className);
      path.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(path);
      return path;
    });
    element.prepend(svg);

    const update = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (!width || !height) return;

      const large = element.matches(
        ".topbar, .main-shell, .performance, .memory-panel",
      );
      const cut = large
        ? 16
        : element.matches(".health-card, .heap-card")
          ? 12
          : 13;
      const polygon = (inset: number, corner: number) =>
        `M ${inset + corner} ${inset} H ${width - inset - corner} L ${width - inset} ${inset + corner} V ${height - inset - corner} L ${width - inset - corner} ${height - inset} H ${inset + corner} L ${inset} ${height - inset - corner} V ${inset + corner} Z`;

      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      paths[0]?.setAttribute("d", polygon(0.65, cut));
      paths[1]?.setAttribute("d", polygon(0.65, cut));
      paths[2]?.setAttribute("d", polygon(4, cut - 1));
      paths[3]?.setAttribute("d", `M 2 ${Math.min(height * 0.34, 87)} V ${cut + 1} L ${cut + 1} 2 H ${width * 0.34} M 5 ${Math.min(height * 0.2, 46)} V ${cut + 4} L ${cut + 5} 5 H ${Math.min(width * 0.22, 81)}`);
      paths[4]?.setAttribute("d", `M ${width - 4} ${height - 27} V ${height - cut - 4} L ${width - cut - 4} ${height - 4} H ${width - Math.min(width * 0.2, 81)} M ${width - 4} 34 V ${cut + 4} L ${width - cut - 4} 4 H ${width - Math.min(width * 0.1, 32)}`);
      paths[5]?.setAttribute("d", `M ${width * 0.51} 1 H ${width * 0.65} M ${width * 0.19} 3 H ${width * 0.33} L ${width * 0.34} 1 M ${width * 0.67} ${height - 1} H ${width * 0.78} L ${width * 0.79} ${height - 3} H ${width - cut - 7}`);
    };

    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    cleanups.set(element, () => {
      observer.disconnect();
      svg.remove();
    });
  },
  beforeUnmount(element) {
    cleanups.get(element)?.();
    cleanups.delete(element);
  },
};
