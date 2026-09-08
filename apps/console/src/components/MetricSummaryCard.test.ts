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

  it("does not rate a non-Web-Vital metric", () => {
    const wrapper = mount(MetricSummaryCard, {
      props: { metric: metric({ name: "FP", type: "web.paint.fp" }) },
    });

    expect(wrapper.find(".good").exists()).toBe(false);
  });
});
