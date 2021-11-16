/**
 * Gets the string representation of a single React node
 *
 * @param {Node} child - Child whose name will be retrieved
 * @returns {string} - The string representation of the node
 */
export function getChildName(child) {
    // child.type for HTML elements
    // child.type.name for React.Component
    // child.type.type.name for React.memo(MyComponent)
    // child.render.name for React.forwardRef(MyComponent)
    if (typeof child.type === typeof {}) {
        while (!(child.type?.name)) {
            if (child.render) {
                return child.render.name;
            }

            child = child.type;
        }
    }

    return child.type.name || child.type;
}

/**
 * Determines if a given child is a certain type.
 * Type can be either React.Component or string name of an HTMLElement.
 *
 * @param {Node} child - Child whose type to check
 * @param {(Node|string)} component - What to compare the child to (React.Component or string name of HTMLElement)
 * @returns {boolean} - If the type of the child matches that of the the specified component
 */
export function childIsOfType(child, component) {
    return (child.type === component) || (getChildName(child) === component);
}

/**
 * Determines if a given child is a React.Component vs an HTMLElement
 *
 * @param {Node} child - Child whose type to check
 * @returns {boolean} - If the child is a React.Component
 */
export function childIsReactComponent(child) {
    return typeof child.type === 'function';
}

/**
 * Internal types used by React in `$$typeof` fields.
 * Useful for overriding React typedefs.
 *
 * @type {Object<string, (symbol|number)>}
 * @see [Source code]{@link https://github.com/facebook/react/blob/v17.0.2/packages/shared/ReactSymbols.js}
 */
export const ReactSymbols = {
    REACT_ELEMENT_TYPE: Symbol?.for('react.element') ?? 0xeac7,
    REACT_PORTAL_TYPE: Symbol?.for('react.portal') ?? 0xeaca,
    REACT_FRAGMENT_TYPE: Symbol?.for('react.fragment') ?? 0xeacb,
    REACT_STRICT_MODE_TYPE: Symbol?.for('react.strict_mode') ?? 0xeacc,
    REACT_PROFILER_TYPE: Symbol?.for('react.profiler') ?? 0xead2,
    REACT_PROVIDER_TYPE: Symbol?.for('react.provider') ?? 0xeacd,
    REACT_CONTEXT_TYPE: Symbol?.for('react.context') ?? 0xeace,
    REACT_FORWARD_REF_TYPE: Symbol?.for('react.forward_ref') ?? 0xead0,
    REACT_SUSPENSE_TYPE: Symbol?.for('react.suspense') ?? 0xead1,
    REACT_SUSPENSE_LIST_TYPE: Symbol?.for('react.suspense_list') ?? 0xead8,
    REACT_MEMO_TYPE: Symbol?.for('react.memo') ?? 0xead3,
    REACT_LAZY_TYPE: Symbol?.for('react.lazy') ?? 0xead4,
    REACT_BLOCK_TYPE: Symbol?.for('react.block') ?? 0xead9,
    REACT_SERVER_BLOCK_TYPE: Symbol?.for('react.server.block') ?? 0xeada,
    REACT_FUNDAMENTAL_TYPE: Symbol?.for('react.fundamental') ?? 0xead5,
    REACT_SCOPE_TYPE: Symbol?.for('react.scope') ?? 0xead7,
    REACT_OPAQUE_ID_TYPE: Symbol?.for('react.opaque.id') ?? 0xeae0,
    REACT_DEBUG_TRACING_MODE_TYPE: Symbol?.for('react.debug_trace_mode') ?? 0xeae1,
    REACT_OFFSCREEN_TYPE: Symbol?.for('react.offscreen') ?? 0xeae2,
    REACT_LEGACY_HIDDEN_TYPE: Symbol?.for('react.legacy_hidden') ?? 0xeae3,
};
