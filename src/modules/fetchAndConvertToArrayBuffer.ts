export const fetchAndConvertToArrayBuffer = async (url: string) => {
    const response = await fetch(url);
    const blob = await response.blob();

    // Check if arrayBuffer() is supported (modern browsers)
    if (typeof blob.arrayBuffer === 'function') {
        // Use arrayBuffer() for modern browsers
        return blob.arrayBuffer();
    } else {
        // Fallback to FileReader for Safari 12 and older browsers
        return new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as ArrayBuffer);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }
};