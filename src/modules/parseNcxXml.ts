import JSZip from "jszip";

//For Epub 2 = parses the toc.ncx file or the spine data to get table of contents
export const parseNcxXml = async (zip: JSZip, opfXml: Document, opfPath: string): Promise<Document> => {

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