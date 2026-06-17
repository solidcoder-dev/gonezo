export type GroupedBarChartSeriesKey = 'expense' | 'income';

export type GroupedBarChartPointView = {
  key: string;
  label: string;
  values: Array<{
    key: GroupedBarChartSeriesKey;
    value: number;
  }>;
};

export type GroupedBarChartViewProps = {
  points: GroupedBarChartPointView[];
  valuePrefix?: string;
};
