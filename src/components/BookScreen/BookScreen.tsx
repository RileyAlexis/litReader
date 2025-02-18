import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { fetchAndConvertToArrayBuffer } from '../../modules/fetchAndConvertToArrayBuffer';

interface BookScreenProps {
    fileUrl: string; // File URL to the EPUB file
}

export const BookScreen: React.FC<BookScreenProps> = ({ fileUrl }) => {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        console.log(fileUrl);

        const loadEPUB = async () => {
            try {

                const arrayBuffer = await fetchAndConvertToArrayBuffer(fileUrl);
                const zip = await JSZip.loadAsync(arrayBuffer);
                const opfFile = zip.file('content.opf');

                if (!opfFile) throw new Error('content.opf not found in EPUB');

                const opfContent = await opfFile?.async('text');
                console.log(opfContent);
                const parser = new DOMParser();
                const opfXml = parser.parseFromString(opfContent, 'application/xml');

                console.log(opfXml);


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