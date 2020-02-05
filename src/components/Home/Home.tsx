import React, { useState } from 'react';
import { Redirect } from "react-router";

function Home(): React.ReactElement {
    const [ redirect, setRedirect ] = useState<boolean>(false);

    if (redirect) {
        return <Redirect push to={'/about'} />;
    }

    return (
        <React.Fragment>
            <div>Home</div>
            <button onClick={() => setRedirect(true)}>Go to About</button>
        </React.Fragment>
    );
}

export default Home;
