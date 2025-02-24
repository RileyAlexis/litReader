import { useEffect, useState } from 'react';

//Types
import { EpubData } from '../../Types/EpubDataTypes';

//Modules
import { loadEpub } from '../../modules/loadEpub';

interface BookScreenProps {
    fileUrl: string; // File URL to the EPUB file
}

export const BookScreen: React.FC<BookScreenProps> = ({ fileUrl }) => {
    const [bookData, setBookData] = useState<EpubData>();
    const [fontSize, setFontSize] = useState<number>(19);

    useEffect(() => {
        const loadBook = async () => {
            const fetchedData = await loadEpub(fileUrl);
            setBookData(fetchedData);
        }

        loadBook();

    }, [fileUrl]);

    //Allows a user selected font size to override the epub CSS
    useEffect(() => {
        if (bookData?.css) {
            const styleId = "epub-dynamic-style"; // Unique ID for the style tag

            // Remove existing style tag if it exists
            const existingStyleTag = document.getElementById(styleId);
            if (existingStyleTag) {
                existingStyleTag.remove();
            }

            // Ensure CSS is clean (remove any unexpected <link> tags)
            const cleanedCss = bookData.css.replace(/<link[^>]+>/g, "");

            // Create a new style tag
            const styleTag = document.createElement("style");
            styleTag.id = styleId; // Assign ID for future reference
            styleTag.textContent = `
           :root {
           font-size: ${fontSize}px;
           }
           ${cleanedCss}
        `;

            document.head.appendChild(styleTag);
        }
    }, [bookData, fontSize]);

    return (
        <div className='bookContainer'>
            <div
                className='bookContent'>

                {bookData?.chapters.map((chapter, index) => (
                    <div
                        className='bookPage'
                        key={index}>
                        <div dangerouslySetInnerHTML={{ __html: chapter.content }} />
                    </div>
                ))}
            </div>
        </div>
    );
};