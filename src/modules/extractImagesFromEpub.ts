import JSZip from "jszip";

export const extractImagesFromEpub = async (zip: JSZip): Promise<Record<string, string>> => {
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