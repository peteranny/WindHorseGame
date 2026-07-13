interface MeasureStyle {
  width: number;
  fontSize: string;
  lineHeight: string;
  fontFamily: string;
}

const createMeasurer = (style: MeasureStyle): HTMLDivElement => {
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.visibility = "hidden";
  el.style.pointerEvents = "none";
  el.style.top = "-9999px";
  el.style.left = "-9999px";
  el.style.width = `${style.width}px`;
  el.style.fontSize = style.fontSize;
  el.style.lineHeight = style.lineHeight;
  el.style.fontFamily = style.fontFamily;
  el.style.whiteSpace = "normal";
  el.style.wordBreak = "break-word";
  document.body.appendChild(el);
  return el;
};

const fits = (el: HTMLDivElement, text: string, maxHeight: number): boolean => {
  el.textContent = text;
  return el.scrollHeight <= maxHeight + 1;
};

// Splits fullText into chunks that each render within maxLines lines at the
// given style, joining them with a leading/trailing "..." so the player can
// tell there's more before/after. Requires a real browser layout engine
// (scrollHeight), so it can't be meaningfully unit-tested under jsdom.
export const paginateText = (
  fullText: string,
  maxLines: number,
  style: MeasureStyle
): string[] => {
  if (!fullText) return [""];
  const el = createMeasurer(style);
  const lineHeightPx = parseFloat(getComputedStyle(el).lineHeight);
  const maxHeight = maxLines * lineHeightPx;
  const pages: string[] = [];
  let remaining = fullText;
  try {
    while (remaining.length > 0) {
      const prefix = pages.length === 0 ? "" : "...";
      if (fits(el, prefix + remaining, maxHeight)) {
        pages.push(prefix + remaining);
        break;
      }
      let lo = 1;
      let hi = remaining.length;
      let best = 1;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (fits(el, `${prefix}${remaining.slice(0, mid)}...`, maxHeight)) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      pages.push(`${prefix}${remaining.slice(0, best)}...`);
      remaining = remaining.slice(best);
    }
  } finally {
    document.body.removeChild(el);
  }
  return pages;
};
