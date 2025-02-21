import JSZip from "jszip";

//Function to verify the existence of the epub container file and return the path to the OPF file
export const verifyEpubGetOpfPath = async (zip: JSZip): Promise<string> => {
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