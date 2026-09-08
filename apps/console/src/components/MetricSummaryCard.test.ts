import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import MetricSummaryCard from "./MetricSummaryCard.vue";

function metric(overrides: Record<string, unknown> = {}) {
  return {
    name: "LCP",
    stats: {
      count: 24,
      average: 128.4,
      p50: 110,
      p75: 184.6,
      p90: 220,
    },
    value: "128",
    unit: "ms",
    type: "web.vital.lcp",
    color: "#ad75fa",
    progress: 3.2,
    state: null,
    ...overrides,
  };
}

describe("MetricSummaryCard", () => {
  it("renders the current metric prop and formats milliseconds", () => {
    const wrapper = mount(MetricSummaryCard, { props: { metric: metric() } });

    expect(wrapper.get("h2").text()).toBe("LCP");
    expect(wrapper.findAll("dl dd").map((item) => item.text())).toEqual([
      "128 ms",
      "185 ms",
      "24",
    ]);
    expect(wrapper.get(".ring-value strong").text()).toBe("128");
  });

  it("formats CLS without a unit suffix", () => {
    const wrapper = mount(MetricSummaryCard, {
      props: {
        metric: metric({
          name: "CLS",
          unit: "score",
          type: "web.vital.cls",
          value: "0.072",
          stats: {
            count: 3,
            average: 0.0724,
            p50: 0.05,
            p75: 0.0944,
            p90: 0.12,
          },
        }),
      },
    });

    expect(wrapper.findAll("dl dd").map((item) => item.text())).toEqual([
      "0.072",
      "0.094",
      "3",
    ]);
  });

  it.each([
    [200, "GOOD"],
    [300, "NEEDS IMPROVEMENT"],
    [501, "POOR"],
  ] as const)("rates INP P75 %s as %s", (p75, expected) => {
    const wrapper = mount(MetricSummaryCard, {
      props: {
        metric: metric({
          name: "INP",
          type: "web.vital.inp",
          stats: { count: 5, average: 240, p50: 220, p75, p90: 520 },
        }),
      },
    });

    expect(wrapper.get(".good").text()).toBe(expected);
  });

  it.each([
    ["web.paint.fp", 1_000, "GOOD"],
    ["web.paint.fp", 1_500, "NEEDS IMPROVEMENT"],
    ["web.paint.fp", 2_001, "POOR"],
    ["web.paint.fcp", 1_800, "GOOD"],
    ["web.paint.fcp", 2_400, "NEEDS IMPROVEMENT"],
    ["web.paint.fcp", 3_001, "POOR"],
  ] as const)("rates %s P75 %s as %s", (type, p75, expected) => {
    const wrapper = mount(MetricSummaryCard, {
      props: {
        metric: metric({
          name: type === "web.paint.fp" ? "FP" : "FCP",
          type,
          stats: { count: 5, average: 800, p50: 700, p75, p90: 2_000 },
        }),
      },
    });

    expect(wrapper.get(".metric-rating").text()).toBe(expected);
  });

  it.each([
    ["loading", "LOADING"],
    ["error", "LOAD FAILED"],
    ["empty", "NO DATA"],
  ] as const)("renders the %s state", (state, expected) => {
    const wrapper = mount(MetricSummaryCard, {
      props: {
        metric: metric({ state, stats: undefined, value: "—", progress: 0 }),
      },
    });

    expect(wrapper.get(`.metric-card__state--${state}`).text()).toBe(expected);
  });

  it("does not rate a memory metric", () => {
    const wrapper = mount(MetricSummaryCard, {
      props: {
        metric: metric({ name: "USED HEAP", type: "web.memory.used_heap" }),
      },
    });

    expect(wrapper.find(".good").exists()).toBe(false);
  });

  it("anchors its recommendation popover to the card icon", async () => {
    const wrapper = mount(MetricSummaryCard, {
      props: {
        metric: metric({
          stats: { count: 5, average: 2_800, p50: 2_600, p75: 3_100, p90: 3_400 },
        }),
        recommendation: {
          metric: "LCP",
          status: "POOR",
          messageKey: "recommendations.lcp",
        },
      },
    });

    const popover = wrapper.get(".recommendation-popover");
    const trigger = popover.get("summary");

    expect(trigger.attributes("aria-label")).toBe(
      "Show optimization recommendation for LCP",
    );
    expect(popover.get(".recommendation-popover__panel").text()).toContain(
      "Inspect the LCP element",
    );

    await trigger.trigger("click");

    expect(popover.attributes("open")).toBeDefined();
  });
});
