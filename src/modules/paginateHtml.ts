export function paginateHtml(
    htmlContent: string,
    fontSize: number,
    lineHeight: number | string,
    scaleFactor: number = 1,
    paddingTop: number = 0,
    paddingBottom: number = 0,
    containerHeight: number
): string[] {

    function getLineHeight(): number {
        let computedLineHeight: number;
        if (typeof lineHeight === 'string' && lineHeight.includes('%')) {
            const percentage = parseFloat(lineHeight.replace('%', ''));
            computedLineHeight = (fontSize * percentage) / 100;
        } else if (typeof lineHeight === 'number') {
            computedLineHeight = fontSize * lineHeight;
        } else {
            computedLineHeight = fontSize * 1.5;
        }
        return computedLineHeight * scaleFactor + paddingTop + paddingBottom;
    }

    const lineHeightPerLine = getLineHeight();
    const linesPerPage = Math.floor(containerHeight / lineHeightPerLine);
    const estimatedCharactersPerLine = 80;

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const elements = Array.from(doc.body.childNodes);

    let pages: string[] = [];
    let currentPageContent: string = '';
    let currentLineCount = 0;
    let openTags: { tag: string, attributes: string }[] = [];

    function closeOpenTags(): string {
        return openTags.map(tagInfo => `</${tagInfo.tag}>`).reverse().join('');
    }

    function reopenOpenTags(): string {
        return openTags.map(tagInfo => `<${tagInfo.tag} ${tagInfo.attributes}>`).join('');
    }

    function addTextToPage(text: string): void {
        let words = text.split(/\s+/);
        let line = '';

        words.forEach(word => {
            if ((line + ' ' + word).length > estimatedCharactersPerLine) {
                if (currentLineCount >= linesPerPage) {
                    pages.push(currentPageContent + closeOpenTags());
                    currentPageContent = reopenOpenTags();
                    currentLineCount = 0;
                }
                currentPageContent += line.trim() + '<br />';
                line = word;
                currentLineCount++;
            } else {
                line += (line ? ' ' : '') + word;
            }
        });

        if (line) {
            if (currentLineCount >= linesPerPage) {
                pages.push(currentPageContent + closeOpenTags());
                currentPageContent = reopenOpenTags();
                currentLineCount = 0;
            }
            currentPageContent += line.trim();
            currentLineCount++;
        }
    }

    function processElement(element: Node): void {
        if (element.nodeType === Node.TEXT_NODE) {
            addTextToPage(element.textContent || '');
        } else if (element.nodeType === Node.ELEMENT_NODE) {
            const el = element as HTMLElement;
            const tag = el.tagName.toLowerCase();
            const attributes = Array.from(el.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ');
            openTags.push({ tag, attributes });
            currentPageContent += `<${tag} ${attributes}>`;

            Array.from(el.childNodes).forEach(child => processElement(child));

            openTags.pop();
            currentPageContent += `</${tag}>`;
        }
    }

    elements.forEach((element) => {
        processElement(element);
    });

    if (currentPageContent.trim() !== '') {
        pages.push(currentPageContent + closeOpenTags());
    }

    return pages.filter(page => page.trim() !== '');
}
