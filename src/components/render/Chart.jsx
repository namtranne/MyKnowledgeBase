import { useEffect, useState } from 'react';

const PALETTE = ['#00f0ff', '#a855f7', '#34d399', '#f472b6', '#fbbf24', '#f87171'];
const axisStyle = { fill: '#94a3b8', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' };
const tooltipStyle = { background: '#0f1629', border: '1px solid #1e293b', borderRadius: 10, color: '#e2e8f0' };
const tooltipItemStyle = { color: '#e2e8f0' };
const tooltipLabelStyle = { color: '#94a3b8', marginBottom: 4 };
const legendStyle = { fontSize: 12, fontFamily: 'JetBrains Mono, monospace' };
// Margins give axis ticks/labels room so nothing is clipped at the container edges.
const CHART_MARGIN = { top: 16, right: 28, bottom: 8, left: 8 };

// recharts is heavy, so it is loaded on demand the first time a <Chart> renders.
let rechartsPromise = null;
const loadRecharts = () => (rechartsPromise ||= import('recharts'));

function ChartInner({ R, type, data, x, keys, height, stacked }) {
  const {
    ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  } = R;

  const commonTooltip = (
    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
  );

  let body;
  if (type === 'line') {
    body = (
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey={x} tick={axisStyle} stroke="#334155" tickMargin={8} padding={{ left: 12, right: 12 }} />
        <YAxis tick={axisStyle} stroke="#334155" width={44} domain={['auto', 'auto']} tickMargin={4} />
        {commonTooltip}<Legend wrapperStyle={legendStyle} />
        {keys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: PALETTE[i % PALETTE.length], stroke: '#0b1120', strokeWidth: 1.5 }}
            activeDot={{ r: 6, stroke: '#0b1120', strokeWidth: 2 }}
            connectNulls
          />
        ))}
      </LineChart>
    );
  } else if (type === 'area') {
    body = (
      <AreaChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey={x} tick={axisStyle} stroke="#334155" tickMargin={8} padding={{ left: 12, right: 12 }} />
        <YAxis tick={axisStyle} stroke="#334155" width={44} tickMargin={4} />
        {commonTooltip}<Legend wrapperStyle={legendStyle} />
        {keys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            stackId={stacked ? '1' : undefined}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            fill={PALETTE[i % PALETTE.length] + '44'}
            dot={{ r: 3, fill: PALETTE[i % PALETTE.length], stroke: '#0b1120', strokeWidth: 1.5 }}
            activeDot={{ r: 6, stroke: '#0b1120', strokeWidth: 2 }}
          />
        ))}
      </AreaChart>
    );
  } else if (type === 'pie') {
    body = (
      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
        <Legend wrapperStyle={legendStyle} />
        <Pie
          data={data}
          dataKey={keys[0] || 'value'}
          nameKey={x}
          cx="50%"
          cy="50%"
          outerRadius="72%"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: '#334155' }}
        >
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#0b1120" strokeWidth={1.5} />)}
        </Pie>
      </PieChart>
    );
  } else {
    body = (
      <BarChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey={x} tick={axisStyle} stroke="#334155" tickMargin={8} />
        <YAxis tick={axisStyle} stroke="#334155" width={44} tickMargin={4} />
        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: '#00f0ff10' }} />
        <Legend wrapperStyle={legendStyle} />
        {keys.map((k, i) => <Bar key={k} dataKey={k} stackId={stacked ? '1' : undefined} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    );
  }
  return <ResponsiveContainer width="100%" height={height}>{body}</ResponsiveContainer>;
}

/**
 * Reusable data-viz component for MDX, e.g.:
 *   <Chart type="bar" data={[{name:'A', value:10}]} x="name" series={["value"]} />
 * Turns "text-version graphs" (tables of numbers) into real charts.
 */
export default function Chart({ type = 'bar', data = [], x = 'name', series, height = 320, title, stacked = false }) {
  const [R, setR] = useState(null);
  useEffect(() => {
    let on = true;
    loadRecharts().then((m) => on && setR(m));
    return () => { on = false; };
  }, []);

  const keys = series || (data[0] ? Object.keys(data[0]).filter((k) => k !== x) : []);

  return (
    <div className="mermaid-host" style={{ flexDirection: 'column' }}>
      {title && <div className="diagram__head" style={{ alignSelf: 'stretch', marginBottom: 8 }}>{title}</div>}
      {R ? (
        <ChartInner R={R} type={type} data={data} x={x} keys={keys} height={height} stacked={stacked} />
      ) : (
        <div className="spinner-wrap" style={{ padding: '2rem' }}><div className="spinner" /></div>
      )}
    </div>
  );
}
