/**
 * Gets the string representation of a single React node
 *
 * @param {Node} child - Child whose name will be retrieved
 * @returns {string} - The string representation of the node
 */
export function getChildName(child) {
    // child.type.name for React.Component
    // child.type for HTML elements
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
