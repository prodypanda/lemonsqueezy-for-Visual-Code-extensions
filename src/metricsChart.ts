import { CodeMetrics } from './types';

/**
 * Generates an interactive HTML chart showing code metrics
 * @param metrics The code metrics to visualize
 * @returns HTML string containing the interactive chart
 */
export function generateMetricsChart(metrics: CodeMetrics): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            <style>
                body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
                .chart-container { display: flex; justify-content: space-between; }
                .chart { width: 48%; height: 400px; }
            </style>
        </head>
        <body>
            <div class="chart-container">
                <div id="pieChart" class="chart"></div>
                <div id="barChart" class="chart"></div>
            </div>
            <script>
                const pieData = [{
                    values: [${metrics.lines}, ${metrics.functions}, ${metrics.classes}],
                    labels: ['Lines', 'Functions', 'Classes'],
                    type: 'pie'
                }];

                const barData = [{
                    x: ['Complexity', 'Words', 'Characters'],
                    y: [${metrics.complexity}, ${metrics.words}, ${metrics.chars}],
                    type: 'bar'
                }];

                Plotly.newPlot('pieChart', pieData, { title: 'Code Structure' });
                Plotly.newPlot('barChart', barData, { title: 'Code Metrics' });
            </script>
        </body>
        </html>
    `;
}
