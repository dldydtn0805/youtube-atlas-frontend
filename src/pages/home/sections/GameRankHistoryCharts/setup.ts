import { BarChart, LineChart } from 'echarts/charts';
import { DataZoomComponent, GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, CanvasRenderer, DataZoomComponent, GridComponent, LineChart, MarkLineComponent, TooltipComponent]);

export default echarts;
