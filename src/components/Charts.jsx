import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { money } from '../lib/hooks';
const colors = ['var(--blue-bright)', 'var(--red-bright)', 'var(--blue-light)', 'var(--gray)'];
const axis = { tick: { fill: 'var(--light-gray)', fontSize: 11 }, stroke: 'var(--gray)', tickLine: false, axisLine: false };
const tooltip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--gray)', borderRadius: 4, color: 'var(--white)' }, labelStyle: { color: 'var(--white)' }, itemStyle: { color: 'var(--white)' }, cursor: { stroke: 'var(--gray)', fill: 'var(--surface-light)' } };
function ChartLegend() { return <div className="chart-legend"><span><i aria-hidden="true" />Pemasukan</span><span><i aria-hidden="true" />Pengeluaran</span></div>; }
export function DashboardFinanceChart({ monthly }) {
  return <><ChartLegend /><div className="chart"><ResponsiveContainer><LineChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
    <CartesianGrid stroke="var(--surface-light)" vertical={false} /><XAxis dataKey="month" {...axis} /><YAxis {...axis} width={64} /><Tooltip {...tooltip} formatter={money} />
    <Line isAnimationActive={false} type="monotone" name="Pemasukan" dataKey="income" stroke="var(--blue-bright)" strokeWidth={2} dot={false} />
    <Line isAnimationActive={false} type="monotone" name="Pengeluaran" dataKey="expense" stroke="var(--red-bright)" strokeDasharray="6 4" strokeWidth={2} dot={false} />
  </LineChart></ResponsiveContainer></div></>;
}
export function InventoryChart({ inventory }) {
  return <ResponsiveContainer width="100%" height={180}><PieChart><Pie isAnimationActive={false} data={inventory} dataKey="quantity" nameKey="status" innerRadius={44} outerRadius={68} stroke="var(--surface)" strokeWidth={3}>
    {inventory.map((row,index) => <Cell key={row.status} fill={colors[index % colors.length]} />)}
  </Pie><Tooltip {...tooltip} /></PieChart></ResponsiveContainer>;
}
export function FinanceChart({ monthly }) {
  return <><ChartLegend /><div className="chart"><ResponsiveContainer><BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
    <CartesianGrid stroke="var(--surface-light)" vertical={false} /><XAxis dataKey="month" {...axis} /><YAxis {...axis} width={64} /><Tooltip {...tooltip} formatter={money} />
    <Bar isAnimationActive={false} name="Pemasukan" dataKey="income" fill="var(--blue-bright)" maxBarSize={24} /><Bar isAnimationActive={false} name="Pengeluaran" dataKey="expense" fill="var(--red-bright)" maxBarSize={24} />
  </BarChart></ResponsiveContainer></div></>;
}
