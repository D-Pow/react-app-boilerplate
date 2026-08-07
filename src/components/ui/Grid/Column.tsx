import React from 'react';

export interface ColumnProps {
  className?: string
  colSpan?: number
  gridArea?: string
  children?: React.ReactNode
}

function Column({
    className,
    colSpan = 1, // Keep here because it's read by the parent <Grid/>
    gridArea = Column.name,
    children,
}: ColumnProps) {
    return (
        <div className={className} style={{ gridArea }}>
            {children}
        </div>
    );
}

export default Column;
