/**
 * Fetches a resource and returns the Base64-encoded result.
 *
 * @param {string} url - URL to which the network request will be made.
 * @param {RequestInit} fetchOptions - Options to pass to the underlying `fetch()` function.
 * @returns {Promise<unknown>} - The result from the [`FileReader`]{@link https://developer.mozilla.org/en-US/docs/Web/API/FileReader}.
 */
export async function fetchAsBase64(url, fetchOptions = {}) {
    const res = await fetch(url, fetchOptions);
    const blob = await res.blob();

    // FileReader uses old API
    // Thus, we must use old Promise API
    return await new Promise((res, rej) => {
        const reader = new FileReader();

        reader.onload = () => {
            res(reader.result);
        };
        reader.onerror = e => {
            rej(e);
        };

        reader.readAsDataURL(blob);
    });
}
