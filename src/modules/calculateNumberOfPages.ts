export function calculateNumberOfPages(
    htmlContent: string,
    fontSize: number,
    lineHeight: number | string,
    scaleFactor: number = 1,
    paddingTop: number = 0,
    paddingBottom: number = 0,
    containerHeight: number
): number {
    // Parse HTML content to extract text elements
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const elements = Array.from(doc.body.querySelectorAll('p, span, div')); // Add other tags as needed

    // If lineHeight is a multiplier, calculate it based on font size
    let computedLineHeight: number;
    if (typeof lineHeight === 'string' && lineHeight.includes('%')) {
        const percentage = parseFloat(lineHeight.replace('%', ''));
        computedLineHeight = (fontSize * percentage) / 100;
    } else if (typeof lineHeight === 'number') {
        computedLineHeight = fontSize * lineHeight;
    } else {
        computedLineHeight = fontSize * 1.5; // Default multiplier is 1.5
    }

    // Adjust for scale factor (if provided)
    const scaledFontSize = fontSize * scaleFactor;
    const scaledLineHeight = computedLineHeight * scaleFactor;

    // Calculate the total height of one line (font + line height + padding)
    const lineHeightPerLine = scaledLineHeight + paddingTop + paddingBottom;

    // Loop through the elements and calculate the total height of all content
    let totalHeight = 0;

    elements.forEach((element) => {
        // Assuming each block of text occupies one line for simplicity. 
        // Adjust this if you need more accurate line-break calculations
        const text = element.textContent || '';
        const numberOfLines = Math.ceil(text.length / 80); // Estimate 80 characters per line (you can adjust this)

        totalHeight += numberOfLines * lineHeightPerLine;
    });

    // Calculate the number of pages required based on the total content height and container height
    const numberOfPages = Math.ceil(totalHeight / containerHeight);
    return numberOfPages;
}
