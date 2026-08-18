import { memo } from 'react';

export interface AnchorProps {
    className?: string
    href?: string
    children?: React.ReactNode
    underlineText?: boolean
    rel?: string | string[]
    target?: string
    onClick?(...args: unknown[]): unknown
    aria?: object
}

function Anchor({
    className = '',
    href = '',
    children = '',
    underlineText = true,
    rel = [ 'noopener', 'noreferrer' ],
    target = Anchor.Targets.NEW_TAB,
    onClick,
    aria = {},
}: AnchorProps) {
    const cls = [ className ];
    const rels: string[] = [];

    if (underlineText) {
        cls.push('underline');
    }

    if (typeof rel === typeof '') {
        rels.push(rel as string);
    } else if (typeof rel === typeof []) {
        rels.push(...rel);
    }

    return (
        <a
            className={cls.join(' ')}
            href={href}
            target={target}
            rel={rels.join(' ')}
            onClick={onClick}
            {...aria}
        >
            {children}
        </a>
    );
}

Anchor.Targets = {
    NEW_TAB: '_blank',
    SAME_TAB: '_self',
    PARENT: '_parent',
    TOP: '_top',
};

export default memo(Anchor);
