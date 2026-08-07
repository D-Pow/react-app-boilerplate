import { useState, useEffect, useRef } from 'react';

import { fetchKitsuTitleSearch } from '@/services/KitsuAnimeSearchService';
import { useKeyboardEvent } from '@/utils/Hooks';

function AnimeSearch() {
    const [ searchText, setSearchText ] = useState('');
    const [ keyDown, setKeyDown ] = useKeyboardEvent();
    const [ searchResults, setSearchResults ] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleTyping = ({ target: { value }}: { target: { value: string; }}) => {
        setSearchText(value);
    };

    const handleSubmit = async () => {
        const titles = await fetchKitsuTitleSearch(searchText.toLowerCase());

        setSearchResults(titles);
    };

    if (keyDown === 'Enter') {
        setKeyDown(null);
        handleSubmit();
    }

    useEffect(() => {
        inputRef?.current?.focus();
    }, []);

    const renderSearchResults = () => {
        if (!searchResults.length) {
            return;
        }

        return (
            <>
                <h5>Results</h5>

                {searchResults.map((title, i) => (
                    <div className={'search-result'} key={i}>{title}</div>
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
                ref={inputRef}
            />
            <button className={'mx-5px'} onClick={handleSubmit}>
                Search
            </button>

            {renderSearchResults()}
        </div>
    );
}

export default AnimeSearch;
