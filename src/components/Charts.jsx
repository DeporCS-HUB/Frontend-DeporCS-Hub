import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { money } from '../lib/hooks';
const colors = ['#16b7aa','#f2ae31','#2478d4','#ef5d69'];
export function DashboardFinanceChart({ monthly }) { return <div className="chart"><ResponsiveContainer><LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={money} />
            <Line type="monotone" name="Pemasukan" dataKey="income" stroke="#1678dc" strokeWidth={3} />
            <Line type="monotone" name="Pengeluaran" dataKey="expense" stroke="#16b7aa" strokeWidth={3} />
          </LineChart></ResponsiveContainer></div>; }
export function InventoryChart({ inventory }) { return <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={inventory} dataKey="quantity" nameKey="status" innerRadius={42} outerRadius={65}>
            {inventory.map((row,index) => <Cell key={row.status} fill={colors[index % colors.length]} />)}
          </Pie><Tooltip /></PieChart></ResponsiveContainer>; }
export function FinanceChart({ monthly }) { return <div className="chart"><ResponsiveContainer><BarChart data={monthly}><CartesianGrid vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={money} /><Bar dataKey="income" fill="#6cc9f0" /><Bar dataKey="expense" fill="#18b59b" /></BarChart></ResponsiveContainer></div>; }
