import { useEffect, useState } from 'react';

//Types
import { EpubData } from '../../Types/EpubDataTypes';

//Modules
import { loadEpub } from '../../modules/loadEpub';
import { SplitContent } from './SplitContent';

interface BookScreenProps {
    fileUrl: string; // File URL to the EPUB file
}

export const BookScreen: React.FC<BookScreenProps> = ({ fileUrl }) => {
    const [bookData, setBookData] = useState<EpubData>();
    const [fontSize, setFontSize] = useState<number>(16);
    const [lineHeight, setLineHeight] = useState<number>(1.4);
    const [chapterIndex, setChapterIndex] = useState(18);
    const [fontFamily, setFontFamily] = useState<string>('Arial');
    const [awakeTime, setAwakeTime] = useState<number>(120000);
    const [intervalId, setIntervalId] = useState<number | null>(null);

    const keepScreenAwake = (time: number) => {
        // Clear any existing intervals first
        if (intervalId !== null) {
            clearInterval(intervalId);
        }

        // Start a new interval to keep the screen awake
        const newIntervalId = setInterval(() => {
            console.log('Keeping the screen awake...');
        }, 1000); // Keep screen awake every second

        setIntervalId(newIntervalId);

        // Stop the interval after the user-set time
        setTimeout(() => {
            clearInterval(newIntervalId);
            console.log('Stopped keeping the screen awake.');
        }, time);
    };

    useEffect(() => {
        // When the component mounts, set the screen to stay awake for the user-defined time
        if (awakeTime > 0) {
            keepScreenAwake(awakeTime);
        }

        // Cleanup interval when the component unmounts
        return () => {
            if (intervalId !== null) {
                clearInterval(intervalId);
            }
        };
    }, [awakeTime]);


    useEffect(() => {
        const loadBook = async () => {
            const fetchedData = await loadEpub(fileUrl);
            setBookData(fetchedData);
            console.log(fetchedData);
        }
        if (fileUrl !== '') {
            loadBook();
        }

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

            // Extract font family from CSS
            const fontFamilyMatch = cleanedCss.match(/font-family:\s*([^;]+);/);
            const extractedFontFamily = fontFamilyMatch ? fontFamilyMatch[1].trim() : 'Arial';
            setFontFamily(extractedFontFamily);

            const lineHeightMatch = cleanedCss.match(/line-height:\s * ([^;]+); /);
            if (lineHeightMatch) {
                setLineHeight(Number(lineHeightMatch));
                console.log('lineHeightMatch', lineHeightMatch);
            }

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

            {bookData && bookData.chapters.length > chapterIndex &&
                <SplitContent content={bookData?.chapters[chapterIndex].content} fontSize={fontSize} fontFamily={fontFamily} lineHeight={lineHeight} />
            }
        </div>
    );
};