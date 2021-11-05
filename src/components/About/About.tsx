import React from 'react';

export interface AboutProps {
    className?: string;
}

function About(props: AboutProps) {
    return (
        <>
            <div className={props.className}>About</div>
        </>
    );
}

About.defaultProps = {
    className: 'font-size-2em',
};

export default About;
