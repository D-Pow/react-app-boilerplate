import React from 'react';
import PropTypes from 'prop-types';

class Column extends React.Component {
    render() {
        const { className, gridArea } = this.props;

        return (
            <div className={className} style={{ gridArea }}>
                {this.props.children}
            </div>
        );
    }
}

Column.propTypes = {
    className: PropTypes.string,
    colSpan: PropTypes.number,
    gridArea: PropTypes.string
};

Column.defaultProps = {
    colSpan: 1,
    gridArea: Column.name
};

export default Column;
