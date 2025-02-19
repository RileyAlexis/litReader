import { useEffect, useState } from 'react';

import { EpubData } from '../../modules/loadEpub';

//Modules
import { loadEpub } from '../../modules/loadEpub';
import { fetchAndConvertToArrayBuffer } from '../../modules/fetchAndConvertToArrayBuffer';

interface BookScreenProps {
    fileUrl: string; // File URL to the EPUB file
}

export const BookScreen: React.FC<BookScreenProps> = ({ fileUrl }) => {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [toc, setToc] = useState<any>();
    const [bookData, setBookData] = useState<EpubData>();
    const [fontSize, setFontSize] = useState<number>(19);

    const [error, setError] = useState<string>('');

    useEffect(() => {
        const loadBook = async () => {
            const fetchedData = await loadEpub(fileUrl);
            setBookData(fetchedData);
            console.log(fetchedData);
        }

        loadBook();

    }, [fileUrl]);


    //Allows a user selected font size to override the epub CSS
    useEffect(() => {
        if (bookData?.css) {
            const updatedCss = `
           :root {
           font-size: ${fontSize}px;
           }
           ${bookData.css}
            `;
            const styleTag = document.createElement("style");
            styleTag.textContent = updatedCss;
            document.head.appendChild(styleTag);
        }
    }, [bookData, fontSize]);

    return (
        <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
            {bookData?.chapters.map((chapter, index) => (
                <div key={index}>
                    {/* <h2>{chapter.title}</h2> */}
                    <div dangerouslySetInnerHTML={{ __html: chapter.content }} />
                </div>
            ))}
        </div>
    );
};