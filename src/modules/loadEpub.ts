import JSZip from "jszip";
import { fetchAndConvertToArrayBuffer } from "./fetchAndConvertToArrayBuffer";

//Types
import { EpubData } from "../Types/EpubDataTypes";

//Modules
import { verifyEpubGetOpfPath } from "./verifyEpubGetOpfPath";
import { getOpfFile } from "./getOpfFile";
import { parseNcxXml } from "./parseNcxXml"; //Epub 2
import { parseNavXml } from "./parseNavXml"; //Epub 3
import { getEpub2TableOfContents } from "./getEpub2TableOfContents";
import { getEpub3TableOfContents } from "./getEpub3TableOfContents";
import { extractChapterContent } from "./extractChapterContent";
import { extractImagesFromEpub } from "./extractImagesFromEpub";
import { extractEpubMetadata } from "./extractEpubMetaData";

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

// Function to remove text colors and backgrounds from CSS
const cleanEpubCss = (epubCss: string): string => {
    return epubCss
        .replace(/color\s*:\s*[^;]+;/gi, "") // Remove text colors
        .replace(/background(-color)?\s*:\s*[^;]+;/gi, "") // Remove backgrounds
        .replace(/background-image\s*:\s*[^;]+;/gi, ""); // Remove background images
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

        const metaData = await extractEpubMetadata(zip, opfXml);
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

        return { toc: tocItems, chapters, css: combinedCSS, metaData: metaData };
    } catch (e: any) {
        console.error(e.message);
        return { toc: [], chapters: [], css: "", metaData: { title: "", author: "", publisher: "", language: "", isbn: "" } };
    }
};