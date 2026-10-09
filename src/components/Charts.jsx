import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { money } from '../lib/hooks';
const colors = ['#F5F6F7', '#B4B2B5', '#705657', '#43474D'];
const axis = { tick: { fill: '#B4B2B5', fontSize: 11 }, stroke: '#43474D', tickLine: false, axisLine: false };
const tooltip = { contentStyle: { background: '#171717', border: '1px solid #43474D', borderRadius: 4, color: '#F5F6F7' }, labelStyle: { color: '#F5F6F7' }, itemStyle: { color: '#F5F6F7' }, cursor: { stroke: '#43474D', fill: '#312F30' } };
function ChartLegend() { return <div className="chart-legend"><span><i aria-hidden="true" />Pemasukan</span><span><i aria-hidden="true" />Pengeluaran</span></div>; }
export function DashboardFinanceChart({ monthly }) {
  return <><ChartLegend /><div className="chart"><ResponsiveContainer><LineChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
    <CartesianGrid stroke="#312F30" vertical={false} /><XAxis dataKey="month" {...axis} /><YAxis {...axis} width={64} /><Tooltip {...tooltip} formatter={money} />
    <Line isAnimationActive={false} type="monotone" name="Pemasukan" dataKey="income" stroke="#F5F6F7" strokeWidth={2} dot={false} />
    <Line isAnimationActive={false} type="monotone" name="Pengeluaran" dataKey="expense" stroke="#B4B2B5" strokeDasharray="6 4" strokeWidth={2} dot={false} />
  </LineChart></ResponsiveContainer></div></>;
}
export function InventoryChart({ inventory }) {
  return <ResponsiveContainer width="100%" height={180}><PieChart><Pie isAnimationActive={false} data={inventory} dataKey="quantity" nameKey="status" innerRadius={44} outerRadius={68} stroke="#171717" strokeWidth={3}>
    {inventory.map((row,index) => <Cell key={row.status} fill={colors[index % colors.length]} />)}
  </Pie><Tooltip {...tooltip} /></PieChart></ResponsiveContainer>;
}
export function FinanceChart({ monthly }) {
  return <><ChartLegend /><div className="chart"><ResponsiveContainer><BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
    <CartesianGrid stroke="#312F30" vertical={false} /><XAxis dataKey="month" {...axis} /><YAxis {...axis} width={64} /><Tooltip {...tooltip} formatter={money} />
    <Bar isAnimationActive={false} name="Pemasukan" dataKey="income" fill="#F5F6F7" maxBarSize={24} /><Bar isAnimationActive={false} name="Pengeluaran" dataKey="expense" fill="#B4B2B5" maxBarSize={24} />
  </BarChart></ResponsiveContainer></div></>;
}
