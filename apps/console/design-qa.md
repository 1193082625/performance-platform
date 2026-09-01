# Dashboard Design QA

- Source visual truth: `/var/folders/qs/8wk3d2zd42n8nf8yd8m9bbfc0000gn/T/codex-clipboard-63b5b975-d59c-46ac-858a-be425e34fe84.png`
- Implementation screenshot: `/private/tmp/performance-dashboard-rebuild-02.png`
- Side-by-side comparison: `/private/tmp/performance-dashboard-rebuild-comparison-02.png`
- Viewport: 1280 × 720 CSS pixels, device density 1, desktop dark theme, 24h selected
- Source pixels: 2676 × 1548, normalized to a 1245 × 720 reference stage
- Implementation pixels: 1280 × 720 with a centered 1244.5 × 720 reference-ratio stage
- State: seeded API-format values matching the source summary values

## Full-view comparison evidence

The implementation uses a single reference-ratio stage and a text-free 1649 × 954 HUD chrome asset. The title frame, status frame, left/right metric frames, central cyan/violet instrument, lower trend frames, connector ornaments, outer frame, grid, and bottom range console now share one coordinate system. Live Vue and ECharts content is overlaid in measured safe areas, with no metric values or chart series baked into the decorative image.

The implementation preserves the reference hierarchy: large angled FP/FCP panels, a dominant center instrument, two lower trend surfaces, and a centered segmented range control. The page fits the 1280 × 720 viewport without document overflow.

## Focused region evidence

The full-view comparison keeps the header, metric rows, central values, chart labels, and range controls readable, so separate crops were not required. The center asset was also inspected before integration and contains no text, numbers, chart lines, labels, glyphs, or controls.

## Findings

- Fonts and typography: condensed system fallbacks approximate the source display face; heading weight, numeric hierarchy, tracking, and glow are aligned. The exact commercial/source font is unavailable.
- Spacing and layout rhythm: major regions, central circle, data safe areas, and bottom control are aligned to the common stage. The generated lower frames have slightly softer perspective than the source but no longer change information hierarchy or hide content.
- Colors and visual tokens: deep navy, cyan FP, violet FCP, blue linework, green live status, and amber selected state match the source palette.
- Image quality and asset fidelity: the decorative asset is sharp at the rendered size and contains only reusable chrome. Dynamic data is never rasterized.
- Copy and content: title, live status, window, total samples, FP/FCP statistics, scores, trend titles, legend text, units, and range labels remain dynamic and semantically present.
- Accessibility: range buttons retain native button behavior, visible focus styling, and `aria-pressed`; chart and tiny decorative labels still require non-screenshot testing for complete assistive-technology coverage.

## Comparison history

1. Initial implementation finding: component-local CSS frames and the generated center image created a different composition and baked a second visual language into the dashboard.
   Fix: replaced them with a single text-free HUD chrome asset and common reference-ratio stage; removed the center raster from the score component.
   Post-fix evidence: all dynamic values remain DOM/ECharts content and align within empty safe areas.
2. First rebuild finding: status/title typography and side-panel information density were too small, and the lower-frame geometry was visually weak.
   Fix: regenerated the chrome with measured region constraints and increased title, status, metric heading, label, and value sizes.
   Post-fix evidence: the second comparison shows stronger hierarchy with fully visible FP/FCP rows and stable chart/range regions.

## Verification

- 1h/24h/7d/30d selector remains interactive; browser verification confirmed 7d becomes the sole pressed option.
- API-backed FP/FCP summaries, total samples, score, score components, and both chart series render.
- Browser console: no warnings or errors.
- Focused Vitest suite: 6 files, 22 tests passed.
- Type check: passed.
- Production build: passed; the existing ECharts chunk-size advisory remains.

## Follow-up polish

- P3: load a licensed or freely available condensed techno display font if exact typography is required.
- P3: the clean generated lower panel frame is less aggressively trapezoidal than the source.
- P3: real trend shapes intentionally follow live data rather than the static reference curves.

final result: passed
