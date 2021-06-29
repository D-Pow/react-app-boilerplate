/**
 * Fetches a resource and returns the Base64-encoded result.
 *
 * @param {string} url
 * @param {RequestInit} fetchOptions
 * @returns {Promise<unknown>}
 */
export async function fetchAsBase64(url, fetchOptions = {}) {
    const res = await fetch(url, fetchOptions);
    const blob = await res.blob();

    // FileReader uses old API
    // Thus, we must use old Promise API
    return await new Promise(res => {
        const reader = new FileReader();

        reader.onload = function() {
            res(this.result);
        };

        reader.readAsDataURL(blob);
    });
}
