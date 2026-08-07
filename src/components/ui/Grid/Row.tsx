import React, { type ReactElement } from 'react';

import { type ColumnProps } from './Column';

type ColumnElement = ReactElement<ColumnProps>;

export interface RowProps {
  children: ColumnElement | ColumnElement[]
  gridTemplateAreas?: string[]
}

function Row({
    children,
    gridTemplateAreas,
}: RowProps) {
    const renderedColumns = React.Children.map(children, (column, colIndex) => {
        return React.cloneElement(column, { gridArea: gridTemplateAreas?.[colIndex] });
    });

    return (
        <>
            {renderedColumns}
        </>
    );
}

export default Row;
