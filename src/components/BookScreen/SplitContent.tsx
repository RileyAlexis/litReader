import { useEffect, useState, useRef, KeyboardEvent, useCallback } from "react";

import { calculateNumberOfPages } from "../../modules/calculateNumberOfPages";
import { paginateHtml } from "../../modules/paginateHtml";

interface SplitContentProps {
    content: string;
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
}

export const SplitContent: React.FC<SplitContentProps> = ({ content, fontSize, fontFamily, lineHeight }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);

    const handleKeyDown = useCallback((event: globalThis.KeyboardEvent) => {
        if (event.key === 'ArrowLeft') {
            prevPage();
        } else if (event.key === "ArrowRight") {
            nextPage();
        }
    }, []);

    const prevPage = () => {
        setCurrentPage((p) => Math.max(0, p - 1));
    }

    const nextPage = () => {
        setCurrentPage((p) => Math.min(pages.length - 1, p + 1));
    }

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown as EventListener);

        return () => {
            window.removeEventListener("keydown", handleKeyDown as EventListener);
        }
    }, [handleKeyDown]);

    const callPaginate = () => {
        const contentSplit = paginateHtml(content, fontSize, lineHeight, 1, 0, 0, window.innerHeight, window.innerWidth);
        setPages(contentSplit);
    }

    useEffect(() => {
        callPaginate();
        window.addEventListener("resize", callPaginate);

        return () => {
            window.removeEventListener("resize", callPaginate);
        }
    }, [content, fontFamily]);

    useEffect(() => {
        console.log('Number of Calculated Pages:', calculateNumberOfPages(content, fontSize, lineHeight, 1, 0, 0, window.innerHeight * 0.9));
        console.log('Pages Array.length', pages.length);
        console.log(pages[currentPage]);
    });

    return (
        <div
            className="splitContentContainer"
            style={{
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "20px",
            }}
            ref={containerRef}
        >
            <div
                className="shownContainer"
                style={{
                    flex: 1,
                    width: "100%",
                    fontSize: fontSize,
                    overflow: "hidden",
                    lineHeight: "1.6",
                    alignItems: "flex-start",
                    textAlign: "left",
                }}
                dangerouslySetInnerHTML={{ __html: pages[currentPage] }}
            />
            <div className="pageButtonContainer"
                style={{
                    display: "flex",
                    width: '100%',
                    justifyContent: 'space-around',
                    marginTop: '1rem',
                }}
            >
                <button onClick={prevPage}>
                    Prev
                </button>
                <div>
                    <span>{currentPage + 1} of {pages.length}</span>
                </div>
                <button onClick={nextPage}>
                    Next
                </button>
            </div>
        </div>
    )
}
