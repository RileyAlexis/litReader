import { useEffect, useState, useRef, KeyboardEvent, useCallback } from "react";

import { calculateNumberOfPages } from "../../modules/calculateNumberOfPages";
import { paginateHtml } from "../../modules/paginateHtml";

interface SplitContentProps {
    content: string;
    fontSize: number;
}

export const SplitContent: React.FC<SplitContentProps> = ({ content, fontSize }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const hiddenRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);

    const paginateContent = () => {
        if (!hiddenRef.current || !containerRef.current) return;

        const viewportHeight = containerRef.current.scrollHeight - (containerRef.current.scrollHeight * 0.1);
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");
        const elements = Array.from(doc.body.childNodes); // Includes all nodes, not just <p>

        let currentHTML = "";
        let pagesArr: string[] = [];
        let currentBlock: string = "";
        let lastNode: string = "";

        // Ensure hiddenRef.current exists before modifying its innerHTML
        if (hiddenRef.current) {
            hiddenRef.current.innerHTML = "";
        }

        // Utility function to split text by words while respecting the overflow
        const handleTextSplit = (text: string): string => {
            const words = text.split(" ");
            let tempContent = "";
            let resultHTML = "";
            let lastValidContent = "";

            words.forEach((word, index) => {
                const space = index > 0 ? " " : "";
                tempContent += space + word;

                // Try to insert text and check for overflow
                if (hiddenRef.current) {
                    hiddenRef.current.innerHTML = currentHTML + currentBlock + tempContent;

                    if (hiddenRef.current.clientHeight > viewportHeight) {
                        // If overflow occurs, push content to the pages
                        pagesArr.push(currentHTML + currentBlock);
                        currentHTML = "";
                        currentBlock = `<p>${lastValidContent.trim()}</p>`; // New page starts with a new <p> block
                        tempContent = word; // Start the next block with the current word
                    }
                }

                lastValidContent = tempContent;
                resultHTML = tempContent;
            });

            return resultHTML;
        };

        // Recursively process nodes and split accordingly
        const processNode = (node: Node): string => {
            if (!hiddenRef.current) return "";

            if (node.nodeType === Node.TEXT_NODE) {
                return handleTextSplit(node.textContent || "");
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                let clone = element.cloneNode(false) as HTMLElement; // Clone without children first
                let innerHTML = "";
                let isBlockElement = ["P", "H1", "H2", "H3", "BLOCKQUOTE", "UL", "OL"].includes(element.tagName);

                // Make sure we preserve the class and other attributes
                clone.className = element.className; // Preserve class name

                // Prevent duplication of 'id' attribute, especially for page markers
                if (element.tagName.toLowerCase() === "a" && element.id) {
                    clone.removeAttribute("id"); // Remove the id if it's for page marker
                }

                // Recursively process child nodes
                node.childNodes.forEach((child) => {
                    innerHTML += processNode(child);
                });

                clone.innerHTML = innerHTML;

                // If the element is a block-level element and we exceed the viewport, push to the pages
                if (hiddenRef.current) {
                    hiddenRef.current.innerHTML = currentHTML + currentBlock + clone.outerHTML;

                    if (hiddenRef.current.clientHeight > viewportHeight) {
                        // If we overflow, push content to pages and reset
                        pagesArr.push(currentHTML + currentBlock);
                        currentHTML = "";
                        currentBlock = `<p>${innerHTML.trim()}</p>`; // Always wrap in <p> when continuing on a new page
                    } else {
                        currentBlock += clone.outerHTML;
                    }
                }

                return clone.outerHTML;
            }

            return "";
        };

        elements.forEach((node) => processNode(node));

        if (currentBlock) {
            pagesArr.push(currentHTML + currentBlock);
        }

        setPages(pagesArr);
    };


    //!End paginate function

    const handleKeyDown = useCallback((event: globalThis.KeyboardEvent) => {
        if (event.key === 'ArrowLeft') {
            prevPage();

        } else if (event.key === "ArrowRight") {
            nextPage();
        }
    }, []);

    const prevPage = () => {
        setCurrentPage((p) => {
            const newNum = Math.max(0, p - 1)
            // console.log(newNum);
            return newNum;
        });
        console.log(pages[currentPage]);
    }

    const nextPage = () => {
        setCurrentPage((p) => {
            const newNum = Math.min(pages.length - 1, p + 1);
            if (pages.length === 0) return 0;
            // console.log(newNum);
            return newNum;
        });
        console.log(pages[currentPage]);
    }


    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown as EventListener);

        return () => {
            window.removeEventListener("keydown", handleKeyDown as EventListener);
        }
    }, [handleKeyDown]);


    const callPaginate = () => {
        const contentSplit = paginateHtml(content, fontSize, 1.6, 1, 0, 0, window.innerHeight * 0.9);
        setPages(contentSplit);
    }

    useEffect(() => {
        // paginateContent();

        callPaginate();

        window.addEventListener("resize", callPaginate);

        return () => {
            window.removeEventListener("resize", callPaginate);
        }
    }, [content]);

    useEffect(() => {
        console.log('Number of Calculated Pages:', calculateNumberOfPages(content, fontSize, 1.6, 1, 0, 0, window.innerHeight * 0.9));
        console.log('Pages Array.length', pages.length);
    })

    return (
        <div
            className="spitContentContainer"
            style={{
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                textAlign: "justify",
                padding: "20px",
            }} ref={containerRef}>

            <div
                className="hiddenContainer"
                ref={hiddenRef} style={{
                    position: "absolute",
                    visibility: "hidden",
                    width: "calc(100vw - 40px)",
                    fontSize: fontSize,
                    lineHeight: "1.6",
                }}>
            </div>

            <div
                className="shownContainer"
                style={{
                    width: "calc(100vw - 40px)",
                    fontSize: fontSize,
                    overflow: "hidden",
                    lineHeight: "1.6"
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
                <button onClick={nextPage}>
                    Next
                </button>
            </div>
        </div>
    )
}
