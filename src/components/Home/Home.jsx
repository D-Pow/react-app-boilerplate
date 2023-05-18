import { useState } from 'react';
import { Navigate } from 'react-router';

import { useServiceWorkerBroadcastChannel } from '@/utils/Hooks';


function Home() {
    const [ redirect, setRedirect ] = useState();

    const broadcastChannel = useServiceWorkerBroadcastChannel(messageEvent => {
        const { data: message } = messageEvent;

        console.log(`Message from ${process.env.BROADCAST_CHANNEL}:`, message);
    });

    if (redirect) {
        return <Navigate to={redirect} />;
    }

    return (
        <>
            <div className={'font-brush-script font-size-2em'}>Home</div>
            <button onClick={() => setRedirect('/about')}>Go to About</button>
            <button onClick={() => setRedirect('/animeSearch')}>Go to anime search</button>
        </>
    );
}

export default Home;
