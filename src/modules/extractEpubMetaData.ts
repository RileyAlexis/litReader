import JSZip from "jszip";
import { MetaData } from "../Types/EpubDataTypes";

export const extractEpubMetadata = async (zip: JSZip, opfPath: string): Promise<{ title: string; author: string; language: string; publisher?: string }> => {
    const metadata: MetaData = {
        title: "Unknown Title",
        author: "Unknown Author",
        language: "Unknown Language",
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

        // Extract author/creator from various possible fields
        const authorNode =
            metadataNode.querySelector("creator") || // Standard EPUB format
            metadataNode.querySelector("[name='author']") || // Some EPUBs use meta tags
            metadataNode.querySelector("[name='dc:creator']") || // Namespaced format
            metadataNode.querySelector("meta[name*='author']") || // Some variations
            metadataNode.querySelector("meta[name*='creator']"); // Other possible versions

        if (authorNode) metadata.author = authorNode.textContent?.trim() || metadata.author;

        // Extract language
        const languageNode = metadataNode.querySelector("language");
        if (languageNode) metadata.language = languageNode.textContent?.trim() || metadata.language;

        // Extract publisher (optional)
        const publisherNode = metadataNode.querySelector("publisher");
        if (publisherNode) metadata.publisher = publisherNode.textContent?.trim();
    } else {
        console.warn("Metadata section not found in content.opf");
    }

    return metadata;
};