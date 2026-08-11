import React, { type RefObject } from 'react';

import { objEquals } from '@/utils/Objects';

import type { ValueOf } from '@/types';

const STARTING_POSITION = 'STARTING_POSITION';

const Frequencies = {
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    NEVER: 'NEVER',
} as const;

const FrequencySvgPropsMapping = {
    [STARTING_POSITION]: {
        path: {
            d: 'M0 141C0 141 0 141 0 141',
        },
        circle: {
            cx: '0',
            cy: '141',
        },
    },
    [Frequencies.WEEKLY]: {
        path: {
            d: 'M0 141C0 141 315.711 123.5 480 5',
        },
        circle: {
            cx: '482',
            cy: '4',
        },
    },
    [Frequencies.MONTHLY]: {
        path: {
            d: 'M-1 141C-1 141 302.338 134.435 482.5 107',
        },
        circle: {
            cx: '482.5',
            cy: '107',
        },
    },
    [Frequencies.NEVER]: {
        path: {
            d: 'M-2 141C-2 141 299.326 139.919 478 136',
        },
        circle: {
            cx: '480',
            cy: '135',
        },
    },
};

export interface InvestmentGrowthSvgProps {
    frequency: ValueOf<typeof Frequencies>;
    animationProps?: object;
    className?: string;
    responsiveSize?: boolean;
}

class InvestmentGrowthSvg extends React.Component<InvestmentGrowthSvgProps> {
    static Frequencies = Frequencies;
    static defaultProps = {
        animationProps: {},
        className: '',
        frequency: Frequencies.WEEKLY,
        responsiveSize: true,
    };

    animatedSvgChildIds = {
        path: 'growth-plot',
        circle: 'growth-plot-end',
    };

    get animationDefaultProps() {
        return {
            fill: 'freeze',
            dur: this.previousFrequency.current === STARTING_POSITION ? '700ms' : '150ms',
        };
    }

    // Track previous props (i.e. "state" of the SVG's <animate.from> attribute)
    // using a ref with shouldComponentUpdate()
    previousFrequency: RefObject<ValueOf<typeof Frequencies> | typeof STARTING_POSITION | null> =
        React.createRef<ValueOf<typeof Frequencies> | typeof STARTING_POSITION>();

    constructor(props: InvestmentGrowthSvgProps) {
        super(props);

        // TODO See if this can be put in class property
        this.previousFrequency.current = STARTING_POSITION;
    }

    /**
     * React lifecycle methods handling updating go in the order:
     *
     * (before React DOM is made)        (After React DOM, before HTML DOM)  (After HTML DOM)
     * shouldComponentUpdate    -> render -> getSnapshotBeforeUpdate    ->   componentDidUpdate.
     *
     * This means that, in order to track what the previous `props.frequency` was
     * and save it *before* rendering the new SVG, we need to update the value within
     * shouldComponentUpdate(). This way, the animation can go from previous
     * path/circle to new path/circle with the updated previous value rather than
     * accidentally using the value before the previous value.
     *
     * Note: If this used state instead of a ref, the component would re-render twice
     * regardless of where the logic were placed.
     *
     * @returns {boolean} - If the component should update.
     */
    shouldComponentUpdate(nextProps: InvestmentGrowthSvgProps) {
        if (this.props.frequency !== nextProps.frequency) {
            this.previousFrequency.current = this.props.frequency;
        }

        return !objEquals(this.props, nextProps);
    }

    /**
     * React reuses HTML elements when re-rendering, which means the <animate>
     * element won't re-trigger when props change.
     *
     * Using the native DOM {@code <animate>.beginElement()} resets the animation
     * timer so it will animate again on props change.
     *
     * Pass this function in the {@code <animate.ref>} field.
     *
     * @param {(React.Ref|null)} animateElemRef - Ref to the <animate> element
     */
    triggerSvgAnimation = (
        animateElemRef: SVGElement & { beginElement?: () => void; },
    ) => {
        // Inline ref callbacks are called twice, first with null, then with element.
        // See: https://reactjs.org/docs/refs-and-the-dom.html#caveats-with-callback-refs
        animateElemRef?.beginElement?.();
    };

    render() {
        const { className, frequency, responsiveSize, animationProps } = this.props;
        const cls = className + (responsiveSize ? ' img-responsive' : '');
        const currentSvgProps = FrequencySvgPropsMapping[frequency];
        const previousSvgProps = FrequencySvgPropsMapping[this.previousFrequency.current!];
        const animateProps = { ...this.animationDefaultProps, ...animationProps };

        return (
            <svg
                className={cls}
                width="486"
                height="141"
                viewBox="0 0 486 141"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <g clipPath="url(#drawing-canvas)">
                    <path
                        id={this.animatedSvgChildIds.path}
                        d={currentSvgProps.path.d}
                        stroke="#5627D8"
                        strokeWidth="2"
                    />
                    <circle
                        id={this.animatedSvgChildIds.circle}
                        cx={currentSvgProps.circle.cx}
                        cy={currentSvgProps.circle.cy}
                        r="3"
                        fill="white"
                        stroke="#5627D8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>

                <defs>
                    <clipPath id="drawing-canvas">
                        <rect width="486" height="141" fill="white" />
                    </clipPath>
                </defs>

                {Object.entries(previousSvgProps).map(([ elemTag, attributesToAnimate ]) => {
                    return Object.entries(attributesToAnimate).map(([ attrName, oldAttrVal ]) => (
                        <animate
                            key={`${elemTag}-${attrName}`}
                            {...animateProps}
                            xlinkHref={`#${this.animatedSvgChildIds[elemTag as keyof typeof this.animatedSvgChildIds]}`}
                            attributeName={attrName}
                            from={oldAttrVal as string}
                            to={currentSvgProps[elemTag as keyof typeof currentSvgProps][attrName as keyof ValueOf<typeof currentSvgProps>]}
                            ref={ref => this.triggerSvgAnimation(ref!)}
                        />
                    ));
                })}
            </svg>
        );
    }
}

export default InvestmentGrowthSvg;
