const number = value => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value);
export function goalResult(goal) {
 const unknown = goal.actual_value == null;
 const actual = unknown ? null : Number(goal.actual_value); const target = Number(goal.target_value);
 const boolean = goal.metric_type === 'boolean';
 const suffix = goal.metric_type === 'percent' ? '%' : ` ${goal.unit}`;
 return { unknown, met: !unknown && actual >= target, ratio: unknown || target <= 0 ? 0 : Math.min(100, Math.max(0, actual / target * 100)),
  actualLabel: unknown ? '—' : boolean ? actual === 1 ? 'Ya' : 'Belum' : `${number(actual)}${suffix}`,
  targetLabel: boolean ? 'Ya' : `${number(target)}${suffix}` };
}
export function milestonePayload(item, status = item.status) {
 return Object.fromEntries(['title', 'due_date', 'start_time', 'end_time', 'venue', 'description', 'schedule_status', 'source_ref'].filter(key => item[key] !== undefined).map(key => [key, item[key]]).concat([['status', status]]));
}
export function agendaTime(item) {
 if (!item.start_time) return '';
 return `${item.start_time.slice(0, 5)}${item.end_time ? `–${item.end_time.slice(0, 5)}` : ''} WIB`;
}
