import JSZip from "jszip";

//Fetches the content.opf file and returns it
export const getOpfFile = async (zip: JSZip, opfPath: string): Promise<string> => {
    const opfFile = await zip.file(opfPath)?.async("text");

    if (opfFile) {
        return opfFile;
    } else {
        throw new Error("OPF File not found")
    }
}