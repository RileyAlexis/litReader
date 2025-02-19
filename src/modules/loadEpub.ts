import JSZip from "jszip";
import { fetchAndConvertToArrayBuffer } from "./fetchAndConvertToArrayBuffer";

export interface EpubData {
    toc: { title: string; href: string }[];
    chapters: Chapter[];
    css: string;
}

export interface Chapter {
    title: string;
    href: string;
    content: string;
}

// Function to fix CSS links inside extracted HTML
const fixCSSLinks = (html: string, chapterPath: string, zip: JSZip) => {
    const chapterDir = chapterPath.substring(0, chapterPath.lastIndexOf("/") + 1);
    return html.replace(/href="([^"]+\.css)"/g, (match, cssFile) => {
        const fixedPath = chapterDir + cssFile;
        return zip.file(fixedPath) ? `href="${fixedPath}"` : match;
    });
};

const extractChapterContent = (doc: Document, tocItem: { title: string; href: string }) => {
    const fragment = tocItem.href.split("#")[1]; // Extract fragment ID
    console.log(fragment);
    // Case 1: If no fragment (no # in href), look for the whole document content
    if (!fragment) {
        return {
            title: tocItem.title,
            href: tocItem.href,
            content: doc.body.innerHTML
        };
    }

    // Case 2: Handle href with # (Fragment ID)
    if (fragment && tocItem.href.includes("#")) {
        // Try to get the element by fragment ID directly using getElementById
        let startAnchor: HTMLElement | null = doc.getElementById(fragment);

        if (!startAnchor) {
            // If no element with the ID, try searching for the <a> element that contains the fragment in its id or name attribute
            startAnchor = doc.querySelector(`a[id="${fragment}"], a[name="${fragment}"]`);
        }

        if (!startAnchor) {
            console.warn(`Anchor #${fragment} not found in ${tocItem.href}`);
            return null;
        }

        let content = startAnchor.outerHTML; // Include the <a> element itself
        let currentElement = startAnchor.nextElementSibling;

        // Capture all content until the next anchor tag or the end of the chapter
        while (currentElement && !currentElement.matches("a[id], a[name]")) {
            content += currentElement.outerHTML;
            currentElement = currentElement.nextElementSibling;
        }

        return {
            title: tocItem.title,
            href: tocItem.href,
            content: content || "<p>(No content found)</p>"
        };
    }

    // Case 3: Handle direct ID without a fragment (non-#)
    // When the href doesn't contain a fragment (no #), look for an element with the same ID
    let startElement = doc.getElementById(fragment);

    if (!startElement) {
        console.warn(`Element with ID ${fragment} not found in ${tocItem.href}`);
        return null;
    }

    // Gather all content from this element to the next section or end of content
    let content = startElement.outerHTML; // Include the element itself
    let currentElement = startElement.nextElementSibling;

    while (currentElement && !currentElement.matches("a[id], a[name]")) {
        content += currentElement.outerHTML;
        currentElement = currentElement.nextElementSibling;
    }

    return {
        title: tocItem.title,
        href: tocItem.href,
        content: content || "<p>(No content found)</p>"
    };
};

export const loadEpub = async (fileUrl: string): Promise<EpubData> => {
    try {
        const arrayBuffer = await fetchAndConvertToArrayBuffer(fileUrl);
        const zip = await JSZip.loadAsync(arrayBuffer);

        console.log("Epub file list", Object.keys(zip.files));

        // Try finding container.xml
        let opfPath: string | null = null;
        const containerFile = await zip.file('META-INF/container.xml')?.async('text');

        if (containerFile) {
            const containerXml = new DOMParser().parseFromString(containerFile, "application/xml");
            opfPath = containerXml.querySelector("rootfile")?.getAttribute("full-path") || null;
        }

        // Fallback: Search for an OPF file manually if container.xml is missing
        if (!opfPath) {
            console.warn("container.xml not found, searching for an OPF file manually.");
            opfPath = Object.keys(zip.files).find(file => file.endsWith(".opf")) || null;
        }

        let tocItems: { title: string; href: string }[] = [];
        const chapters: Chapter[] = [];
        let combinedCSS = "";

        if (opfPath) {
            console.log("Using OPF file:", opfPath);
            const opfFile = await zip.file(opfPath)?.async("text");

            if (!opfFile) throw new Error("OPF File not found");

            const opfXml = new DOMParser().parseFromString(opfFile, "application/xml");

            // Extract TOC (EPUB 2)
            const ncxItem = opfXml.querySelector('manifest item[media-type="application/x-dtbncx+xml"]');

            if (ncxItem) {
                console.log('Using toc.ncx for TOC extraction');
                let ncxPath = ncxItem.getAttribute('href');
                if (!ncxPath) throw new Error("toc.ncx href not found");

                if (!ncxPath.startsWith("http") && opfPath.includes("/")) {
                    const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);
                    ncxPath = opfDir + ncxPath;
                }

                const ncxFile = await zip.file(ncxPath)?.async("text");
                if (!ncxFile) throw new Error("toc.ncx file not found in epub");

                const ncxXml = new DOMParser().parseFromString(ncxFile, "application/xml");
                const navPoints = ncxXml.querySelectorAll("navMap navPoint");

                navPoints.forEach(navPoint => {
                    const title = navPoint.querySelector("navLabel text")?.textContent || "Untitled";
                    let href = navPoint.querySelector("content")?.getAttribute("src") || "";

                    if (!href.startsWith("http") && opfPath.includes("/")) {
                        const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);
                        href = opfDir + href;
                    }
                    tocItems.push({ title, href });
                });
            } else {
                console.log("toc.ncx not found using spine for TOC");
                const spine = opfXml.querySelector("spine");
                const itemRefs = spine?.querySelectorAll("itemref");

                itemRefs?.forEach(itemRef => {
                    const idref = itemRef.getAttribute("idref");
                    if (idref) {
                        const item = opfXml.querySelector(`manifest item[id="${idref}"]`);
                        const href = item?.getAttribute("href");
                        if (href) {
                            tocItems.push({ title: href, href });
                        }
                    }
                });
            }
        } else {
            console.warn("No OPF file found, scanning for potential HTML chapters...");
            // EPUB 1.0 compatibility: Scan for HTML/XHTML files as fallback
            tocItems = Object.keys(zip.files)
                .filter(file => file.endsWith(".html") || file.endsWith(".xhtml"))
                .map(file => ({ title: file, href: file }));
        }

        console.log("Extracted TOC:", tocItems);

        // Extract CSS files
        const cssFiles = Object.keys(zip.files).filter(file => file.endsWith(".css"));
        for (const cssFile of cssFiles) {
            const cssContent = await zip.file(cssFile)?.async("text");
            if (cssContent) {
                combinedCSS += cssContent + "\n";
            }
        }

        // Extract chapter content
        for (const tocItem of tocItems) {
            const chapterFilePath = tocItem.href;
            console.log(`Loading chapter file: ${chapterFilePath}`);

            // Ensure the file exists in the EPUB
            const chapterFile = await zip.file(chapterFilePath)?.async("text");

            if (chapterFile) {
                const doc = new DOMParser().parseFromString(chapterFile, "text/html");

                const chapter = extractChapterContent(doc, tocItem);

                if (chapter) {
                    chapters.push(chapter);
                }
            } else {
                console.warn(`Failed to load chapter: ${chapterFilePath}`);
            }
        }

        return { toc: tocItems, chapters, css: combinedCSS };
    } catch (e: any) {
        console.error(e.message);
        return { toc: [], chapters: [], css: "" };
    }
};