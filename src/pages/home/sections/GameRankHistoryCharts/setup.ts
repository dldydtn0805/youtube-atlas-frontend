import { BarChart, LineChart } from 'echarts/charts';
import { DataZoomComponent, GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([BarChart, DataZoomComponent, GridComponent, LineChart, MarkLineComponent, SVGRenderer, TooltipComponent]);

export default echarts;
