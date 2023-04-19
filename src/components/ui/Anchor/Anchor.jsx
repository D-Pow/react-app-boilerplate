import { memo } from 'react';
import PropTypes from 'prop-types';

function Anchor(props) {
    const cls = [ props.className ];
    const rel = [];

    if (props.underlineText) {
        cls.push('underline');
    }

    if (typeof props.rel === typeof '') {
        rel.push(props.rel);
    } else if (typeof props.rel === typeof []) {
        rel.push(...props.rel);
    }

    return (
        <a
            className={cls.join(' ')}
            href={props.href}
            target={props.target}
            rel={rel.join(' ')}
            onClick={props.onClick}
            {...props.aria}
        >
            {props.children}
        </a>
    );
}

Anchor.Targets = {
    NEW_TAB: '_blank',
    SAME_TAB: '_self',
    PARENT: '_parent',
    TOP: '_top',
};

Anchor.propTypes = {
    className: PropTypes.string,
    href: PropTypes.string,
    children: PropTypes.node,
    underlineText: PropTypes.bool,
    rel: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
    ]),
    target: PropTypes.string,
    onClick: PropTypes.func,
    aria: PropTypes.object,
};

Anchor.defaultProps = {
    className: '',
    href: '',
    children: '',
    underlineText: true,
    rel: [ 'noopener', 'noreferrer' ],
    target: Anchor.Targets.NEW_TAB,
    aria: {},
};

export default memo(Anchor);
