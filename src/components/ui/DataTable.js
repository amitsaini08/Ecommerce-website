import { cn } from '@/lib/cn';
import Spinner from './Spinner';

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };

/*
columns: [{ key, header, render(row), align?, className? }]
*/
export default function DataTable({
  columns,
  rows,
  rowKey = (row) => row._id || row.id,
  loading = false,
  emptyText = 'Nothing to show yet.',
  rowClassName,
  onRowClick
}) {
  const span = columns.length;

  return (
    <div className="overflow-x-auto rounded-xl border border-warm-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-warm-200 bg-warm-50 text-[12px] font-semibold uppercase tracking-wider text-warm-600">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn('px-4 py-3', ALIGN[col.align || 'left'], col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-warm-100">
          {loading ? (
            <tr>
              <td colSpan={span} className="px-4 py-12">
                <div className="flex items-center justify-center gap-2 text-warm-400">
                  <Spinner /> Loading...
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={span} className="px-4 py-12 text-center text-warm-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('transition-colors hover:bg-warm-50/60', rowClassName?.(row))}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-3 text-[13px] align-middle', ALIGN[col.align || 'left'], col.className)}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}