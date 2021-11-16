import type {
    InferProps as PropTypesInferProps,
} from 'prop-types';

import type {
    OmitValues,
} from '@/utils/Types/Generics';


/**
 * Extracts types of JSX component props defined using PropTypes.
 *
 * `PropTypes.InferProps` has a bug where they inject `null` as a possible type for
 * JSX `propTypes` (e.g. `type | null | undefined`) but non-required types can only
 * be `type | undefined`.
 *
 * This fixes the bug by stripping out the `null` values from the resulting
 * `PropTypes.InferProps` call.
 * Note: It must be done for each key-value pair separately so the pairing is maintained.
 *
 * @see [PropTypes.InferProps bug]{@link https://github.com/DefinitelyTyped/DefinitelyTyped/issues/45094}
 */
export type InferProps<O> = OmitValues<PropTypesInferProps<O>, null>;
