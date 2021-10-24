import PropTypes from 'prop-types';

function SpinnerCircle(props) {
    if (!props.show) {
        return '';
    }

    return (
        <div className={'spinner-border spinner-border-sm'} />
    );
}

SpinnerCircle.propTypes = {
    show: PropTypes.bool,
};

export default SpinnerCircle;
