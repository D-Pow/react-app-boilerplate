import { useState } from 'react';

import { fetchKitsuTitleSearch } from '@/services/KitsuAnimeSearchService';
import { useKeyboardEvent } from '@/utils/Hooks';

function AnimeSearch(props) {
    const [ searchText, setSearchText ] = useState('');
    const [ keyDown, setKeyDown ] = useKeyboardEvent();
    const [ searchResults, setSearchResults ] = useState([]);

    const handleTyping = ({ target: { value }}) => {
        setSearchText(value);
    };

    const handleSubmit = async () => {
        const response = await fetchKitsuTitleSearch(searchText.toLowerCase());
        const titles = response.data.map(result => result.attributes.canonicalTitle);

        setSearchResults(titles);
    };

    if (keyDown === 'Enter') {
        setKeyDown(null);
        handleSubmit();
    }

    const renderSearchResults = () => {
        if (!searchResults.length) {
            return;
        }

        return (
            <>
                <h5>Results</h5>

                {searchResults.map((title, i) => (
                    <div key={i}>{title}</div>
                ))}
            </>
        );
    };

    return (
        <div>
            <h3>Anime search</h3>
            <input
                className={'form-control input-large remove-focus-highlight'}
                type={'search'}
                placeholder={'e.g. "Kimi no na wa"'}
                value={searchText}
                onChange={handleTyping}
            />
            <button className={'mx-5px'} onClick={handleSubmit}>
                Search
            </button>

            {renderSearchResults()}
        </div>
    );
}

export default AnimeSearch;
