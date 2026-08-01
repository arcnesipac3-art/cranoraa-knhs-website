import React from 'react';
import { cn } from '../../styles/designSystem';

/**
 * Professional Table Component
 * For data tables with consistent styling
 * 
 * Standardized: rounded-xl container, border-slate-200, consistent header/body
 */

export const Table = ({ children, className = '', ...props }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table
        className={cn('min-w-full divide-y divide-slate-200', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const TableHeader = ({ children, className = '', ...props }) => {
  return (
    <thead className={cn('bg-slate-50', className)} {...props}>
      {children}
    </thead>
  );
};

export const TableBody = ({ children, className = '', ...props }) => {
  return (
    <tbody
      className={cn('bg-white divide-y divide-slate-100', className)}
      {...props}
    >
      {children}
    </tbody>
  );
};

export const TableRow = ({ children, className = '', interactive = false, ...props }) => {
  return (
    <tr
      className={cn(
        interactive && 'hover:bg-slate-50 transition-colors cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead = ({ children, className = '', ...props }) => {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableCell = ({ children, className = '', ...props }) => {
  return (
    <td
      className={cn('px-4 py-3 text-sm text-slate-900', className)}
      {...props}
    >
      {children}
    </td>
  );
};

export default Table;
