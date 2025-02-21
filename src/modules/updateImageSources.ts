export const updateImageSources = (htmlString: string, imageMap: Record<string, string>): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    const images = doc.querySelectorAll("img");

    images.forEach((img) => {
        const originalSrc = img.getAttribute("src");
        if (originalSrc) {
            // Normalize the path (remove leading ./, ../, etc.)
            let normalizedSrc = decodeURIComponent(originalSrc)
                .replace(/^(\.\/|\.\.\/)*/, "") // Remove leading ./ or ../
                .replace(/\\/g, "/"); // Normalize slashes

            // Find the correct key in the imageMap
            const matchedKey = Object.keys(imageMap).find(key => key.endsWith(normalizedSrc));

            if (matchedKey) {
                img.setAttribute("src", imageMap[matchedKey]); // Set Blob URL
                console.log(`Updated image src: ${originalSrc} → ${imageMap[matchedKey]}`);
            } else {
                console.warn(`Image not found in map: ${normalizedSrc}`);
            }
        }
    });

    return doc.documentElement.outerHTML; // Return updated HTML
};