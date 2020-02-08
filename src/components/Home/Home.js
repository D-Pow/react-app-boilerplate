import React, { useState } from 'react';
import { Redirect } from "react-router";

function Home() {
    const [ redirect, setRedirect ] = useState();

    if (redirect) {
        return <Redirect push to={redirect} />;
    }

    return (
        <React.Fragment>
            <div>Home</div>
            <button onClick={() => setRedirect('/about')}>Go to About</button>
            <button onClick={() => setRedirect('/animeSearch')}>Go to anime search</button>
        </React.Fragment>
    );
}

export default Home;
