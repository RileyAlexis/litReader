import JSZip from "jszip";

import { updateImageSources } from "./updateImageSources";

// Types
import { TOC, Chapter } from "../Types/EpubDataTypes";

const cleanHtml = (html: string): string => {
    return html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, ""); // Remove link elements
};

// Extract chapter content
export const extractChapterContent = async (zip: JSZip, tocItems: TOC[], opfPath: string, imageMap: Record<string, string>): Promise<Chapter[]> => {
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

        // Looks for an anchor index in the href and separates it from the file path
        const anchorIndex = href.indexOf('#');
        if (anchorIndex !== -1) {
            fileHref = fullHref.substring(0, anchorIndex);
            anchorId = fullHref.substring(anchorIndex + 1);
        }

        let contentFile: string | undefined = await zip.file(fileHref)?.async("text");

        if (!contentFile) {
            // If file can't be found, search the zip for a matching file
            const zipFiles = Object.keys(zip.files);
            const matchingFile = zipFiles.find((file) => file.includes(fileHref)); // Simple search for the file in the zip

            if (matchingFile) {
                console.warn(`File not found at ${fileHref}, using fallback: ${matchingFile}`);
                contentFile = await zip.file(matchingFile)?.async("text");
            } else {
                console.warn(`Unable to find content file at ${fileHref} or in fallback search.`);
                continue;
            }
        }

        // Ensure contentFile is a valid string before proceeding
        if (!contentFile) {
            console.error(`Failed to load content for ${fileHref}`);
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

        // Clean up HTML
        chapterContent = cleanHtml(chapterContent);

        chapters.push({
            title: title,
            href,
            content: chapterContent
        });
    }

    return chapters;
};