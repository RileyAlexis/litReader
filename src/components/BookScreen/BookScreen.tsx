import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { fetchAndConvertToArrayBuffer } from '../../modules/fetchAndConvertToArrayBuffer';

interface BookScreenProps {
    fileUrl: string; // File URL to the EPUB file
}

export const BookScreen: React.FC<BookScreenProps> = ({ fileUrl }) => {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [toc, setToc] = useState<any>();
    const [bookData, setBookData] = useState<any>();

    const [error, setError] = useState<string>('');

    useEffect(() => {
        console.log(fileUrl);

        const loadEPUB = async () => {
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
                let tocItems: any[] = [];

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

                setToc(tocItems);
                console.log('Extracted TOC:', tocItems);
            }
            catch (e: any) {
                console.error(e.message);
            }
        }

        loadEPUB();
    }, [fileUrl]);

    return (
        <div
            style={{ width: '100%', height: '100%', overflowY: 'auto' }}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
};