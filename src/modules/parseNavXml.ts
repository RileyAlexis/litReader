import JSZip from "jszip";

//For Epub 3 - parses the nav data for table of contents
export const parseNavXml = async (zip: JSZip, opfXml: Document): Promise<Document> => {
    const navItem = Array.from(opfXml.getElementsByTagName("item")).find(item => item.getAttribute("properties")?.includes("nav"));
    if (!navItem) throw new Error("Navigation document (TOC) not found in OPF File");

    const navHref = navItem.getAttribute("href");
    if (!navHref) throw new Error("TOC file href not found");


    const navFile = await zip.file(navHref)?.async("text");
    if (!navFile) throw new Error("TOC XHTML file not found in EPUB");

    return new DOMParser().parseFromString(navFile, "application/xhtml+xml");
}