import { TOC } from "../Types/EpubDataTypes";

export const getEpub2TableOfContents = async (ncxXml: Document): Promise<TOC[]> => {
    const tocItems: TOC[] = [];

    const navMap = ncxXml.querySelector("navMap");
    if (!navMap) throw new Error("navMap not found in NCX file");

    const navPoints = Array.from(navMap.getElementsByTagName("navPoint"));

    for (const navPoint of navPoints) {
        const titleElement = navPoint.querySelector("navLabel > text");
        const contentElement = navPoint.querySelector("content");

        const title = titleElement?.textContent?.trim() || "Untitled";
        const href = contentElement?.getAttribute("src") || "";

        if (href) tocItems.push({ title, href });
    }

    return tocItems;
}