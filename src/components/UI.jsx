import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function StatCard({ icon, title, value, trend, down = false, color = 'blue' }) {
  const TrendIcon = down ? ArrowDownRight : ArrowUpRight;

  return (
    <Card className="stat">
      <span className={`stat-icon ${color}`}>{icon}</span>
      <div>
        <small>{title}</small>
        <strong className={typeof value === 'string' && value.startsWith('Rp') ? 'currency-value' : undefined}>{value}</strong>
        {trend && (
          <em className={down ? 'down' : ''}>
            <TrendIcon />
            {trend}
          </em>
        )}
      </div>
    </Card>
  );
}

export function Badge({ children, tone = 'cyan' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Progress({ value }) {
  return (
    <div className="progress">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export function PanelTitle({ title, action }) {
  return (
    <div className="panel-title">
      <h3>{title}</h3>
      {action}
    </div>
  );
}
