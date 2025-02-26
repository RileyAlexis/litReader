import React, { useEffect, useState, useRef } from 'react';

interface PaginationProps {
    content: string;
    fontSize: number;
}

export const Pagination: React.FC<PaginationProps> = ({ content, fontSize }) => {
    const [currentPage, setCurrentPage] = useState<number>(0);
    const pages = paginateContent(content, 3000); // Adjust the chars per page based on your content
    const [wordsPerPage, setWordsPerPage] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Simple pagination function based on characters per page
    function paginateContent(content: string, charsPerPage: number): string[] {
        const pages: string[] = [];
        let currentPage = '';
        let charCount = 0;

        for (let i = 0; i < content?.length; i++) {
            currentPage += content[i];
            charCount++;
            if (charCount >= charsPerPage) {
                pages.push(currentPage);
                currentPage = '';
                charCount = 0;
            }
        }

        if (currentPage) pages.push(currentPage); // Add remaining content as the last page
        return pages;
    }

    function calculateWordsPerPage(container: HTMLDivElement, fontSize: number): number {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Assume an average word length in characters (can be adjusted based on language/content)
        const averageWordLength = 5; // average characters per word (adjust as needed)
        const lineHeight = fontSize * 1.4; // Line height is typically around 1.4 times the font size

        // Calculate the number of words per line
        const wordsPerLine = Math.floor(containerWidth / (fontSize * averageWordLength));

        // Calculate the number of lines that fit in the viewport
        const linesPerPage = Math.floor(containerHeight / lineHeight);

        // Calculate the total number of words per page
        return wordsPerLine * linesPerPage;
    }

    const nextPage = () => {
        if (currentPage < pages.length - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const prevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    useEffect(() => {
        if (containerRef.current) {
            const words = calculateWordsPerPage(containerRef.current, fontSize);
            setWordsPerPage(words);
        }
    }, [fontSize]);

    useEffect(() => {
        console.log(content);
    }, []);

    return (
        <div>
            <div className="page" dangerouslySetInnerHTML={{ __html: pages[currentPage] }} />
            <div className="controls">
                <button onClick={prevPage}>Previous</button>
                <button onClick={nextPage}>Next</button>
            </div>
        </div>
    );
};


