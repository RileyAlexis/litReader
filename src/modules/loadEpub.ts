import JSZip from "jszip";
import { fetchAndConvertToArrayBuffer } from "./fetchAndConvertToArrayBuffer";

//Types
import { EpubData, TOC, Chapter } from "../Types/EpubDataTypes";

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

//Fetches the content.opf file and returns it
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


    // Resolve relative NCX path based on OPF location
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);
    const ncxFullPath = opfDir + ncxHref;

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

// Extract chapter content
const extractChapterContent = async (zip: JSZip, tocItems: TOC[], opfPath: string, imageMap: Record<string, string>): Promise<Chapter[]> => {
    const chapters: Chapter[] = [];
    let lastFileHref: string | null = null;

    for (const tocItem of tocItems) {
        const href = tocItem.href;
        const title = tocItem.title;

        if (!href) continue;

        const fullHref = opfPath.endsWith("/") ? opfPath + href : opfPath + "" + href;
        let fileHref = href;
        let anchorId: string | null = null;

        let chapterContent = "";

        //Looks for an anchor index in the href and separates it from the file path
        const anchorIndex = href.indexOf('#');
        if (anchorIndex !== -1) {
            fileHref = fullHref.substring(0, anchorIndex);
            anchorId = fullHref.substring(anchorIndex + 1);
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

        // Replace image URLs before storing the content
        chapterContent = updateImageSources(chapterContent, imageMap);

        chapters.push({
            title: title,
            href,
            content: chapterContent
        });
    }

    return chapters;
};

// Function to remove text colors and backgrounds from CSS
const cleanEpubCss = (epubCss: string): string => {
    return epubCss
        .replace(/color\s*:\s*[^;]+;/gi, "") // Remove text colors
        .replace(/background(-color)?\s*:\s*[^;]+;/gi, "") // Remove backgrounds
        .replace(/background-image\s*:\s*[^;]+;/gi, ""); // Remove background images
};

const extractImagesFromEpub = async (zip: JSZip): Promise<Record<string, string>> => {
    const imageMap: Record<string, string> = {};

    const imageFiles = Object.keys(zip.files).filter(file => file.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i));

    for (const imageFile of imageFiles) {
        const blob = await zip.file(imageFile)?.async("blob");
        if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            imageMap[decodeURIComponent(imageFile)] = blobUrl; // Store in map
        }
    }

    return imageMap;
};

const updateImageSources = (htmlString: string, imageMap: Record<string, string>): string => {
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
            tocItems = await getEpub3TableOfContents(navXml);
        } catch (epub3Error) {
            console.warn('EPUB 3 TOC extraction failed, trying Epub 2');
            const ncxXml = await parseNcxXml(zip, opfXml, opfPath);
            tocItems = await getEpub2TableOfContents(ncxXml);
        }

        const imageMap = await extractImagesFromEpub(zip);
        const chapters = await extractChapterContent(zip, tocItems, contentPath, imageMap);

        let combinedCSS = "";
        // Extract CSS and clean
        const cssFiles = Object.keys(zip.files).filter(file => file.endsWith(".css"));
        for (const cssFile of cssFiles) {
            const cssContent = await zip.file(cssFile)?.async("text");
            if (cssContent) {
                const cleanedCss = cleanEpubCss(cssContent); // Clean before storing
                combinedCSS += cleanedCss + "\n";
            }
        }


        return { toc: tocItems, chapters, css: combinedCSS };
    } catch (e: any) {
        console.error(e.message);
        return { toc: [], chapters: [], css: "" };
    }
};