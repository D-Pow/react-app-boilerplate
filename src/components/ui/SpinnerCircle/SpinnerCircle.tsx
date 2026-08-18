export interface SpinnerCircleProps {
    show?: boolean
}

function SpinnerCircle(props: SpinnerCircleProps) {
    if (!props.show) {
        return <></>;
    }

    return (
        <div className={'spinner-border spinner-border-sm'} />
    );
}

export default SpinnerCircle;
