import JSZip from "jszip";
import { fetchAndConvertToArrayBuffer } from "./fetchAndConvertToArrayBuffer";

export interface EpubData {
    toc: { title: string; href: string }[];
    chapters: Chapter[];
}

export interface Chapter {
    title: string;
    href: string;
    content: string;
}

export const loadEpub = async (fileUrl: string): Promise<EpubData> => {
    try {

        const arrayBuffer = await fetchAndConvertToArrayBuffer(fileUrl);
        const zip = await JSZip.loadAsync(arrayBuffer);

        console.log("Epub file list", Object.keys(zip.files));

        const containerFile = await zip.file('META-INF/container.xml')?.async('text');
        if (!containerFile) throw new Error('container.xml not found');

        const containerXml = new DOMParser().parseFromString(containerFile, "application/xml");
        const opfPath = containerXml.querySelector("rootfile")?.getAttribute("full-path");
        if (!opfPath) throw new Error("OPF file path not found");

        const opfFile = await zip.file(opfPath)?.async("text");
        if (!opfFile) throw new Error("OPF File not found");

        const opfXml = new DOMParser().parseFromString(opfFile, "application/xml");

        const ncxItem = opfXml.querySelector('manifest item[media-type="application/x-dtbncx+xml"]');
        let tocItems: { title: string; href: string; }[] = [];

        if (ncxItem) {
            console.log('Using toc.ncx for TOC extraction');
            const ncxPath = ncxItem.getAttribute('href');
            if (!ncxPath) throw new Error("toc.nxc href not found");

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
        console.log('Extracted TOC:', tocItems);

        //Extract chapter content
        const chapters: Chapter[] = [];
        for (const tocItem of tocItems) {
            const chapterFile = await zip.file(tocItem.href)?.async("text");
            if (chapterFile) {
                chapters.push({
                    title: tocItem.title,
                    href: tocItem.href,
                    content: chapterFile
                });
            } else {
                console.warn(`Failed to load chapter: ${tocItem.href}`);
            }
        }

        return { toc: tocItems, chapters };
    }
    catch (e: any) {
        console.error(e.message);
        return { toc: [], chapters: [] }
    }
}