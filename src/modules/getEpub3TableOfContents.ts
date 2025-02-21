import { TOC } from "../Types/EpubDataTypes";

export const getEpub3TableOfContents = async (navXml: Document): Promise<TOC[]> => {
    const tocItems: TOC[] = [];
    const navElement = navXml.querySelector('nav[epub\\:type="toc"], nav[role="doc-toc"], nav');

    if (!navElement) {
        throw new Error("TOC <nav> element not found in EPUB 3 Navigation Document");
    }

    const links = Array.from(navElement.querySelectorAll("a"));

    for (const link of links) {
        const href = link.getAttribute("href");
        const title = link.textContent?.trim() || "Untitled";

        if (href) {
            tocItems.push({
                title,
                href: href.startsWith("#") ? href : `${href}`,
            });
        }
    }

    return tocItems;
};
