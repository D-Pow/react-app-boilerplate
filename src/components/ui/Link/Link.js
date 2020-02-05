import React from 'react';
import PropTypes from 'prop-types';

function Link(props) {
    const cls = [ props.className ];

    if (props.underlineText) {
        cls.push('underline');
    }

    return (
        <a className={cls.join(' ')} href={props.href} target="_blank" rel="noopener noreferrer" {...props.aria}>
            {props.children}
        </a>
    );
}

Link.propTypes = {
    className: PropTypes.string,
    href: PropTypes.string,
    children: PropTypes.node,
    underlineText: PropTypes.bool,
    aria: PropTypes.object
};

Link.defaultProps = {
    className: '',
    href: '',
    children: '',
    underlineText: true,
    aria: {}
};

export default Link;
