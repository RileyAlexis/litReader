import JSZip from "jszip";
import { fetchAndConvertToArrayBuffer } from "./fetchAndConvertToArrayBuffer";

export interface EpubData {
    toc: TOC[];
    chapters: Chapter[];
    css: string;
}

export interface TOC {
    title: string;
    href: string;
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

const extractChapterContentBackup = (doc: Document, tocItem: { title: string; href: string }) => {
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

//Function to verify the existence of the epub container file and return the path to the OPF file
const verifyEpubGetOpfPath = async (zip: JSZip): Promise<string> => {
    let opfPath: string | null = null;

    //Find path to the epub container file and read the path to the opf file
    const containerFile = await zip.file('META-INF/container.xml')?.async('text');

    if (containerFile) {
        const containerXml = new DOMParser().parseFromString(containerFile, "application/xml");
        opfPath = containerXml.querySelector("rootfile")?.getAttribute("full-path") || null;
        if (opfPath) {
            return opfPath;
        } else {
            throw new Error("OPF Path not found");
        }

        //If no container file this is not a valid epub file
    } else {
        throw new Error("Container.xml not found. Not a valid Epub file");

    }
}

const getOpfFile = async (zip: JSZip, opfPath: string): Promise<string> => {
    const opfFile = await zip.file(opfPath)?.async("text");

    if (opfFile) {
        return opfFile;
    } else {
        throw new Error("OPF File not found")
    }
}

//Reads the contents of the content.opf file and returns the parsed xml
const parseOpfXml = async (zip: JSZip, opfFile: string): Promise<Document> => {
    const opfXml = new DOMParser().parseFromString(opfFile, "application/xml");
    return opfXml;
}

//Returns the version of the EPUB file as stated in the content.opf
const getEpubVersion = async (zip: JSZip, opfXml: Document): Promise<string | null> => {
    const packageElement = opfXml.querySelector('package');
    const version = packageElement ? packageElement.getAttribute("version") : "Unknown";
    return version;
}

//For Epub 2 = parses the toc.ncx file or the spine data to get table of contents
const parseNcxXml = async (zip: JSZip, opfXml: Document, opfPath: string): Promise<Document> => {
    console.log("OPF XML in parseNcxXml:", opfXml);

    // Attempt to find the NCX file in the OPF manifest
    let ncxItem: Element | null = opfXml.querySelector('manifest item[media-type="application/x-dtbncx+xml"]');

    // If not found in the manifest, expand search to other possible NCX references in the manifest
    if (!ncxItem) {
        console.warn("NCX file not found in OPF manifest. Expanding search...");
        const allItems = Array.from(opfXml.querySelectorAll("manifest item"));

        // Look for a file ending in .ncx
        ncxItem = allItems.find((item) => {
            const href = item.getAttribute("href")?.toLowerCase();
            return href?.endsWith(".ncx");
        }) || null;

        if (!ncxItem) {
            console.warn("NCX file still not found in OPF manifest. Checking spine...");
            // Look in the spine for the NCX reference (fallback for some EPUBs)
            const spineItems = Array.from(opfXml.querySelectorAll("spine itemref"));
            for (const spineItem of spineItems) {
                const itemId = spineItem.getAttribute("idref");
                if (itemId) {
                    const itemInManifest = opfXml.querySelector(`manifest item[id="${itemId}"]`);
                    if (itemInManifest) {
                        const href = itemInManifest.getAttribute("href");
                        if (href?.toLowerCase().endsWith(".ncx")) {
                            ncxItem = itemInManifest;
                            break;
                        }
                    }
                }
            }
        }

        if (!ncxItem) {
            throw new Error("No NCX file found in OPF manifest or spine.");
        }
    }

    // Extract NCX file path and handle relative paths
    let ncxHref = ncxItem.getAttribute("href");
    if (!ncxHref) throw new Error("NCX file href attribute missing.");

    console.log("Found NCX file reference:", ncxHref);

    // Resolve relative NCX path based on OPF location
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);
    const ncxFullPath = opfDir + ncxHref;
    console.log("Resolved NCX file path:", ncxFullPath);

    //Read and parse the NCX XML file
    const ncxFile = await zip.file(ncxFullPath)?.async("text");
    if (!ncxFile) throw new Error(`NCX file not found at ${ncxFullPath}`);

    const ncxXml = new DOMParser().parseFromString(ncxFile, "application/xml");
    return ncxXml;
};

//For Epub 3 - parses the nav data for table of contents
const parseNavXml = async (zip: JSZip, opfXml: Document): Promise<Document> => {
    const navItem = Array.from(opfXml.getElementsByTagName("item")).find(item => item.getAttribute("properties")?.includes("nav"));
    if (!navItem) throw new Error("Navigation document (TOC) not found in OPF File");

    const navHref = navItem.getAttribute("href");
    if (!navHref) throw new Error("TOC file href not found");

    console.log("Nav Href", navHref);

    const navFile = await zip.file(navHref)?.async("text");
    if (!navFile) throw new Error("TOC XHTML file not found in EPUB");

    return new DOMParser().parseFromString(navFile, "application/xhtml+xml");
}

const getEpub2TableOfContents = async (ncxXml: Document): Promise<TOC[]> => {
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

const getEpub3TableOfContents = async (navXml: Document): Promise<TOC[]> => {
    const tocItems: TOC[] = [];

    // Step 1: Locate the <nav> element with epub:type="toc"
    const navElement = navXml.querySelector('nav[epub\\:type="toc"], nav[role="doc-toc"], nav');

    console.log(navXml.querySelectorAll("li"));
    console.log('NavElement*************************', navElement);

    if (!navElement) {
        throw new Error("TOC <nav> element not found in EPUB 3 Navigation Document");
    }

    const links = Array.from(navElement.querySelectorAll("a"));

    for (const link of links) {
        const href = link.getAttribute("href");
        const title = link.textContent?.trim() || "Untitled";

        // Ensure that href exists before pushing the item
        if (href) {
            tocItems.push({
                title,
                href: href.startsWith("#") ? href : `${href}`, // Handle relative URLs if needed
            });
        }
    }

    return tocItems;
};

// Extract chapter content
const extractChapterContent = async (zip: JSZip, tocItems: TOC[], opfPath: string): Promise<Chapter[]> => {
    const chapters: Chapter[] = [];
    let lastFileHref: string | null = null;

    for (const tocItem of tocItems) {
        const href = tocItem.href;
        const title = tocItem.title;

        if (!href) continue;

        const fullHref = opfPath.endsWith("/") ? opfPath + href : opfPath + "" + href;
        let fileHref = href;
        let anchorId: string | null = null;
        //TODO: Remove consoles
        console.log('Full HREF', fullHref);

        let chapterContent = "";

        //Looks for an anchor index in the href and separates it from the file path
        const anchorIndex = href.indexOf('#');
        if (anchorIndex !== -1) {
            fileHref = fullHref.substring(0, anchorIndex);
            anchorId = fullHref.substring(anchorIndex + 1);

            //TODO: Remove consoles
            console.log(`fileHref`, fileHref);
            console.log('anchorID', anchorId);
        }

        const contentFile = await zip.file(fileHref)?.async("text");
        if (!contentFile) {
            console.warn(`Unable to find content file at ${fileHref}`);
            continue;
        }

        const contentDoc = new DOMParser().parseFromString(contentFile, "application/xhtml+xml");

        if (!anchorId || lastFileHref !== fileHref) {
            chapterContent = contentFile;
        } else {
            let section = contentDoc.querySelector(`#${anchorId}`) || contentDoc.getElementById(anchorId);
            if (section) {
                let contentParts: string[] = [];
                let nextElement: Element | null = section.nextElementSibling;

                while (nextElement && !nextElement.id) {
                    contentParts.push(nextElement.outerHTML);
                    nextElement = nextElement.nextElementSibling;
                }
                chapterContent = section.outerHTML + contentParts.join("");
            } else {
                console.warn(`Section with id ${anchorId} not found in ${fileHref}`);
                chapterContent = contentFile;
            }
        }

        lastFileHref = fileHref;

        chapters.push({
            title: title,
            href,
            content: chapterContent
        });
    }

    return chapters;
};


export const loadEpub = async (fileUrl: string): Promise<EpubData> => {
    try {
        const arrayBuffer = await fetchAndConvertToArrayBuffer(fileUrl);
        const zip = await JSZip.loadAsync(arrayBuffer);
        const opfPath = await verifyEpubGetOpfPath(zip);
        const contentPath = opfPath.substring(0, opfPath.indexOf('/') + 1) || "";
        const opfFile = await getOpfFile(zip, opfPath);
        const opfXml = await parseOpfXml(zip, opfFile);
        // const version = await getEpubVersion(zip, opfXml);

        let tocItems;

        try {
            const navXml = await parseNavXml(zip, opfXml);
            console.log('NavXml**************', navXml);
            tocItems = await getEpub3TableOfContents(navXml);
        } catch (epub3Error) {
            console.warn('EPUB 3 TOC extraction failed, trying Epub 2');
            const ncxXml = await parseNcxXml(zip, opfXml, opfPath);
            tocItems = await getEpub2TableOfContents(ncxXml);
        }

        const chapters = await extractChapterContent(zip, tocItems, contentPath);
        let combinedCSS = "";


        // Extract CSS files
        const cssFiles = Object.keys(zip.files).filter(file => file.endsWith(".css"));
        for (const cssFile of cssFiles) {
            const cssContent = await zip.file(cssFile)?.async("text");
            if (cssContent) {
                combinedCSS += cssContent + "\n";
            }
        }



        return { toc: tocItems, chapters, css: combinedCSS };
    } catch (e: any) {
        console.error(e.message);
        return { toc: [], chapters: [], css: "" };
    }
};