import React from 'react';
import { cn } from '../../styles/designSystem';

/**
 * Professional Table Component
 * For data tables with consistent styling
 * 
 * Standardized: rounded-xl container, border-slate-200, consistent header/body
 * Mobile: Tables stack vertically as cards on screens < 640px
 * 
 * Usage with mobile stacking:
 *   <Table mobileStackable>
 *     <TableHeader>
 *       <TableRow mobileHeader="Name" mobileHeaderKey="name">
 *         <TableHead>Name</TableHead>
 *         <TableHead>Email</TableHead>
 *       </TableRow>
 *     </TableHeader>
 *     <TableBody>
 *       <TableRow mobileHeader="John Doe" mobileHeaderKey="name">
 *         <TableCell>John Doe</TableCell>
 *         <TableCell data-label="Email">john@example.com</TableCell>
 *       </TableRow>
 *     </TableBody>
 *   </Table>
 */

export const Table = ({ children, className = '', mobileStackable = false, ...props }) => {
  return (
    <div className={cn(
      'overflow-x-auto rounded-xl border border-slate-200',
      mobileStackable && 'sm:overflow-x-auto overflow-visible'
    )}>
      <table
        className={cn(
          'min-w-full divide-y divide-slate-200',
          mobileStackable && 'mobile-stackable',
          className
        )}
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

export const TableRow = ({ children, className = '', interactive = false, mobileHeader, mobileHeaderKey, ...props }) => {
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

export const TableCell = ({ children, className = '', 'data-label': dataLabel, ...props }) => {
  return (
    <td
      className={cn(
        'px-4 py-3 text-sm text-slate-900',
        'mobile-cell',
        className
      )}
      data-label={dataLabel}
      {...props}
    >
      {children}
    </td>
  );
};

export default Table;
