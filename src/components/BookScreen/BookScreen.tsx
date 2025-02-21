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
            const styleTag = document.createElement("style");
            styleTag.id = "custom-reader-style"; // Unique ID to prevent duplicates

            const updatedCss = `
            :root {
                font-size: ${fontSize}px !important;
                color: whitesmoke !important;
            }
            body, p, span, div, h1, h2, h3, h4, h5, h6, a, li, td, th {
                color: whitesmoke !important;
            }
            * {
                color: inherit !important; /* Removes any color settings */
            }
            ${bookData.css.replace(/color\s*:\s*[^;]+;/gi, "")} /* Strip 'color' properties from EPUB CSS */
        `;

            styleTag.textContent = updatedCss;

            // Remove any existing style tag with the same ID
            const existingStyleTag = document.getElementById("custom-reader-style");
            if (existingStyleTag) {
                existingStyleTag.remove();
            }

            document.head.appendChild(styleTag);
        }
    }, [bookData, fontSize]);

    return (
        <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
            {bookData?.chapters.map((chapter, index) => (
                <div key={index}>
                    <div dangerouslySetInnerHTML={{ __html: chapter.content }} />
                </div>
            ))}
        </div>
    );
};