import JSZip from "jszip";
import { MetaData } from "../Types/EpubDataTypes";

export const extractEpubMetadata = async (zip: JSZip, opfPath: string): Promise<MetaData> => {
    const metadata: MetaData = {
        title: "Unknown Title",
        author: "Unknown Author",
        language: "Unknown Language",
        isbn: "",
    };


    const opfFile = await zip.file(opfPath)?.async("text");
    if (!opfFile) {
        console.warn("Unable to find content.opf");
        return metadata;
    }

    const opfDoc = new DOMParser().parseFromString(opfFile, "application/xml");
    const metadataNode = opfDoc.querySelector("metadata");

    if (metadataNode) {
        // Extract title
        const titleNode = metadataNode.querySelector("title");
        if (titleNode) metadata.title = titleNode.textContent?.trim() || metadata.title;

        // Extract author/creator
        const authorNode =
            metadataNode.querySelector("creator") ||
            metadataNode.querySelector("[name='author']") ||
            metadataNode.querySelector("[name='dc:creator']") ||
            metadataNode.querySelector("meta[name*='author']") ||
            metadataNode.querySelector("meta[name*='creator']");

        if (authorNode) metadata.author = authorNode.textContent?.trim() || metadata.author;

        // Extract language
        const languageNode = metadataNode.querySelector("language");
        if (languageNode) metadata.language = languageNode.textContent?.trim() || metadata.language;

        // Extract publisher (optional)
        const publisherNode = metadataNode.querySelector("publisher");
        if (publisherNode) metadata.publisher = publisherNode.textContent?.trim();

        // Extract ISBN
        const isbnNode = metadataNode.querySelector("identifier[opf\\:scheme='ISBN'], identifier");
        if (isbnNode) {
            const isbnValue = isbnNode.textContent?.trim();
            if (isbnValue && /^\d{10,13}$/.test(isbnValue)) {
                metadata.isbn = isbnValue; // Ensure it's a valid ISBN-10 or ISBN-13
            }
        }
    } else {
        console.warn("Metadata section not found in content.opf");
    }

    return metadata;
};