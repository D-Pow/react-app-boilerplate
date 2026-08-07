import React, { type HTMLAttributes, type ReactElement } from 'react';

import Row, { type RowProps } from './Row';
import Column from './Column';

type RowElement = ReactElement<RowProps>;

interface GridProps {
  children: RowElement | RowElement[];
  className?: string
  aria?: HTMLAttributes<HTMLDivElement>
}

class Grid extends React.Component<GridProps> {
    static Row = Row;
    static Column = Column;

    static defaultProps = {
        className: '',
        aria: {},
    };

    generateGridNames() {
        const gridAreaNamesUsed: string[][] = [];
        const gridTemplateAreasText = React.Children.map(this.props.children, (row, rowIndex) => {
            const rowAreaNamesUsed: string[] = [];
            const rowAreaNamesText = React.Children.map(row.props.children, (column, colIndex) => {
                const columnAreaName = `grid-cell-${rowIndex}-${colIndex}`;
                const columnAreaNames = Array.from({ length: column.props.colSpan ?? 1 }, () => {
                    return columnAreaName;
                });

                rowAreaNamesUsed.push(columnAreaName);

                return columnAreaNames.join(' ');
            });

            gridAreaNamesUsed.push(rowAreaNamesUsed);

            return `'${rowAreaNamesText.join(' ')}'`;
        }).join(' ');

        return { gridTemplateAreasText, gridAreaNamesUsed };
    }

    render() {
        const { gridTemplateAreasText, gridAreaNamesUsed } = this.generateGridNames();
        const renderedRows = React.Children.map(this.props.children, (row, index) => {
            return React.cloneElement(row, { gridTemplateAreas: gridAreaNamesUsed[index] });
        });

        const { aria: { style: ariaStyle, ...aria } = {}} = this.props;
        const style = {
            ...ariaStyle,
            gridTemplateAreas: gridTemplateAreasText,
        };

        return (
            <div className={`${this.props.className} grid`} style={style} {...aria}>
                {renderedRows}
            </div>
        );
    }
}

export default Grid;
