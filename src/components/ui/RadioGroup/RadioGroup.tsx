import {
    Fragment,
    useState,
    useCallback,
    type ReactNode,
    type ChangeEvent,
} from 'react';

import type {
    ComponentProps,
} from '@/types';


export interface RadioGroupProps<ValueType> {
    name: string;
    entries: {
        value: ValueType;
        body: ReactNode;
    }[];
    onChange: (value: ValueType, event: ChangeEvent<HTMLInputElement>) => void;
    checkbox?: boolean;
    inputProps?: ComponentProps;
    labelProps?: ComponentProps;
}


// TODO Add support for multi-select checkboxes
export default function RadioGroup<ValueType = string>({
    name = 'radio-group',
    entries = [],
    onChange = () => {},
    checkbox = false,
    inputProps = {},
    labelProps = {},
}: RadioGroupProps<ValueType>) {
    const [ checkedRadio, setCheckedRadio ] = useState<ValueType>();
    const handleRadioClick = useCallback(value => {
        return (event: ChangeEvent<HTMLInputElement>) => {
            onChange(value, event);
            setCheckedRadio(value);
        };
    }, [ onChange ]);

    return (
        <>
            {entries.map(({ value, body }) => {
                const radioName = `${name}-${value}`;

                return (
                    <Fragment key={`${value}`}>
                        <input
                            type={checkbox ? 'checkbox' : 'radio'}
                            id={radioName}
                            name={radioName}
                            value={`${value}`}
                            checked={value === checkedRadio}
                            onChange={handleRadioClick(value)}
                            {...inputProps}
                        />
                        <label
                            htmlFor={radioName}
                            {...labelProps}
                        >
                            {body}
                        </label>
                    </Fragment>
                );
            })}
        </>
    );
}
