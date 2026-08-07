export interface AboutProps {
    className?: string;
}

function About({
    className = 'font-size-2em',
}: AboutProps) {
    return (
        <>
            <div className={className}>About</div>
        </>
    );
}

export default About;
