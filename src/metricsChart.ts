import { CodeMetrics } from './types';

/**
 * Creates a fancy chart showing code statistics
 * 
 * How it works:
 * 1. Takes code statistics as input
 * 2. Creates an HTML page with two charts:
 *    - Left side: Pie chart showing code structure
 *    - Right side: Bar chart showing metrics
 * 3. Uses Plotly library to make interactive charts
 * 
 * @param metrics Statistics about the code we're analyzing
 * @returns HTML code that shows the charts
 */
export function generateMetricsChart(metrics: CodeMetrics): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <!-- Load the chart library -->
            <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
            
            <!-- Make it look nice -->
            <style>
                body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
                .chart-container { display: flex; justify-content: space-between; }
                .chart { width: 48%; height: 400px; }
            </style>
        </head>
        <body>
            <!-- Container for our charts -->
            <div class="chart-container">
                <div id="pieChart" class="chart"></div>
                <div id="barChart" class="chart"></div>
            </div>
            
            <!-- Create the charts -->
            <script>
                // Pie chart data
                const pieData = [{
                    values: [${metrics.lines}, ${metrics.functions}, ${metrics.classes}],
                    labels: ['Lines', 'Functions', 'Classes'],
                    type: 'pie'
                }];

                // Bar chart data
                const barData = [{
                    x: ['Complexity', 'Words', 'Characters'],
                    y: [${metrics.complexity}, ${metrics.words}, ${metrics.chars}],
                    type: 'bar'
                }];

                // Draw the charts
                Plotly.newPlot('pieChart', pieData, { title: 'Code Structure' });
                Plotly.newPlot('barChart', barData, { title: 'Code Metrics' });
            </script>
        </body>
        </html>
    `;
}
