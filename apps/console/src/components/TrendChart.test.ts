import { shallowMount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import VChart from "vue-echarts";

import TrendChart from "./TrendChart.vue";
import type { TrendSeries } from "./trend-series.js";

const SERIES: TrendSeries[] = [
  {
    key: "fp",
    label: "FP",
    unit: "ms",
    color: "#09d9ea",
    points: [
      {
        time: "2026-09-08T08:00:00.000Z",
        value: 120,
      },
      {
        time: "2026-09-08T09:00:00.000Z",
        value: 180,
      },
    ],
  },
];

describe("TrendChart", () => {
  it("passes the real trend option to VChart", () => {
    const wrapper = shallowMount(TrendChart, {
      props: {
        series: SERIES,
        ariaLabel: "Average paint performance trend",
      },
    });

    const chart = wrapper.findComponent(VChart);

    expect(chart.exists()).toBe(true);
    expect(chart.props("autoresize")).toBe(true);
    expect(chart.attributes("aria-label")).toBe(
      "Average paint performance trend",
    );

    expect(chart.props("option")).toMatchObject({
      xAxis: {
        data: [
          "2026-09-08T08:00:00.000Z",
          "2026-09-08T09:00:00.000Z",
        ],
      },
      series: [
        {
          id: "fp",
          name: "FP",
          data: [120, 180],
        },
      ],
    });
  });

  it("shows an empty state when no series has values", () => {
    const wrapper = shallowMount(TrendChart, {
      props: {
        series: [
          {
            ...SERIES[0]!,
            points: [
              {
                time: "2026-09-08T08:00:00.000Z",
                value: null,
              },
            ],
          },
        ],
        ariaLabel: "Empty performance trend",
      },
    });

    expect(wrapper.text()).toContain("暂无趋势数据");
    expect(wrapper.findComponent(VChart).exists()).toBe(false);
  });

  it("distinguishes loading from an empty result", () => {
    const wrapper = shallowMount(TrendChart, {
      props: { series: [], loading: true },
    });

    expect(wrapper.text()).toContain("趋势数据加载中");
    expect(wrapper.text()).not.toContain("暂无趋势数据");
  });

  it("distinguishes a request failure from an empty result", () => {
    const wrapper = shallowMount(TrendChart, {
      props: { series: [], error: true },
    });

    expect(wrapper.text()).toContain("趋势数据加载失败");
    expect(wrapper.text()).not.toContain("暂无趋势数据");
  });
});
