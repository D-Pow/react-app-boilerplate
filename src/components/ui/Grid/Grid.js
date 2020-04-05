import React from 'react';
import PropTypes from 'prop-types';
import Row from './Row';
import Column from './Column';
import { childIsOfType, getChildName } from 'utils/ReactParsing';

class Grid extends React.Component {
    static Row = Row;
    static Column = Column;

    generateGridNames() {
        const gridAreaNamesUsed = [];
        const gridTemplateAreasText = React.Children.map(this.props.children, (row, rowIndex) => {
            const rowAreaNamesUsed = [];
            const rowAreaNamesText = React.Children.map(row.props.children, (column, colIndex) => {
                const columnAreaName = `grid-cell-${rowIndex}-${colIndex}`;
                const columnAreaNames = Array.from({ length: column.props.colSpan }, () => {
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
            return React.cloneElement(row, { gridTemplateAreas: gridAreaNamesUsed[index]})
        });

        const { aria: { style: ariaStyle, ...aria }} = this.props;
        const style = {
            ...ariaStyle,
            gridTemplateAreas: gridTemplateAreasText
        };

        return (
            <div className={`${this.props.className} grid`} style={style} {...aria}>
                {renderedRows}
            </div>
        );
    }
}

Grid.propTypes = {
    children: props => {
        for (let child of React.Children.toArray(props.children)) {
            if (!childIsOfType(child, Row)) {
                return new Error(`Invalid child ${getChildName(child)} passed to Grid. Expected Row.`);
            }
        }
    },
    className: PropTypes.string,
    aria: PropTypes.object
};

Grid.defaultProps = {
    className: '',
    aria: {}
};

export default Grid;
