export function paginateHtml(
    htmlContent: string,   // The HTML content to paginate
    fontSize: number,      // Font size in pixels
    lineHeight: number | string,  // Line height as a multiplier or in pixels
    scaleFactor: number = 1,  // Scaling factor (default is 1)
    paddingTop: number = 0,  // Padding at the top of the content (in px)
    paddingBottom: number = 0, // Padding at the bottom of the content (in px)
    containerHeight: number // The available height for the content (in px)
): string[] {
    // Helper function to calculate line height based on font size and scaling
    function getLineHeight(): number {
        let computedLineHeight: number;
        if (typeof lineHeight === 'string' && lineHeight.includes('%')) {
            const percentage = parseFloat(lineHeight.replace('%', ''));
            computedLineHeight = (fontSize * percentage) / 100;
        } else if (typeof lineHeight === 'number') {
            computedLineHeight = fontSize * lineHeight;
        } else {
            computedLineHeight = fontSize * 1.5; // Default multiplier is 1.5
        }

        return computedLineHeight * scaleFactor + paddingTop + paddingBottom;
    }

    const lineHeightPerLine = getLineHeight();
    const linesPerPage = Math.floor(containerHeight / lineHeightPerLine);

    // Extract text from HTML while keeping track of paragraph boundaries
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Flatten the HTML content into a single string with text and respecting block tags
    const elements = Array.from(doc.body.querySelectorAll('p, span, div, br')); // Adjust as needed

    let fullText = '';
    let currentParagraphText = '';

    elements.forEach((element) => {
        if (element.tagName === 'P') {
            // Push the current paragraph text if we are already collecting text for the current paragraph
            if (currentParagraphText.length > 0) {
                fullText += currentParagraphText + '\n\n';  // Double newline to separate paragraphs
            }
            currentParagraphText = element.textContent || '';
        } else {
            currentParagraphText += (element.textContent || '');
        }
    });

    // Push the last paragraph after looping
    if (currentParagraphText.length > 0) {
        fullText += currentParagraphText + '\n\n';
    }

    // Split the content into lines based on the estimated character length per line (80 characters per line as a basic estimate)
    const estimatedCharactersPerLine = 80;  // Adjust based on your font and screen resolution
    const lines: string[] = [];
    let remainingText = fullText;

    while (remainingText.length > 0) {
        const line = remainingText.slice(0, estimatedCharactersPerLine);
        lines.push(line);
        remainingText = remainingText.slice(estimatedCharactersPerLine);
    }

    // Now break the lines into pages based on the lines per page
    const pages: string[] = [];
    for (let i = 0; i < lines.length; i += linesPerPage) {
        const pageLines = lines.slice(i, i + linesPerPage);
        pages.push(pageLines.join('\n'));
    }

    return pages;
}