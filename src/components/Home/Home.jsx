import { useState } from 'react';
import { Navigate } from 'react-router';

import Image from '@/components/ui/Image';
import { useServiceWorkerBroadcastChannel } from '@/utils/Hooks';
import SvgUrl, {
    ReactComponent as SvgComponent,
} from '@/assets/react_logo.svg';

import * as styles from './Home.module.scss';

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
            <div className={'font-brush-script font-size-2em'}>
                <SvgComponent className={styles.homeWrappingIcon} width={25} />
                Home
                <Image className={styles.homeWrappingIcon} src={SvgUrl} alt={SvgComponent.name} aria={{ width: 25 }} />
            </div>
            <button onClick={() => setRedirect('/about')}>Go to About</button>
            <button onClick={() => setRedirect('/animeSearch')}>Go to anime search</button>
        </>
    );
}

export default Home;
