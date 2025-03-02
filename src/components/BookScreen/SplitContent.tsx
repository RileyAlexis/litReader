import { useEffect, useState, useRef, KeyboardEvent, useCallback } from "react";

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
        // const divHeight = containerRef.current.getBoundingClientRect().height;
        const divHeight = parseFloat(window.getComputedStyle(containerRef.current).height);
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");
        const elements = Array.from(doc.body.querySelectorAll("*"));

        console.log('Viewport height', viewportHeight, 'divheight:', divHeight);

        let currentHTML = "";
        let pagesArr: string[] = [];

        if (hiddenRef.current) {
            hiddenRef.current.innerHTML = ""; // Clear previous content
        }

        const processNode = (node: Node): string => {
            if (node.nodeType === Node.TEXT_NODE) {
                let words = node.textContent?.split(" ") || [];
                let tempContent = "";
                let resultHTML = "";

                words.forEach((word, index) => {
                    const space = index > 0 ? " " : "";
                    tempContent += space + word;
                    hiddenRef.current!.innerHTML = currentHTML + resultHTML + tempContent;

                    if (hiddenRef.current) {
                        if (hiddenRef.current?.clientHeight > viewportHeight) {
                            pagesArr.push(currentHTML);
                            currentHTML = resultHTML + word;
                            tempContent = word;
                        }
                    }
                    resultHTML = tempContent;
                });
                return resultHTML;
            } else if (node.nodeType === node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                let clone = element.cloneNode(false) as HTMLElement;
                let innerHTML = "";

                node.childNodes.forEach((child) => {
                    innerHTML += processNode(child);
                });

                clone.innerHTML = innerHTML;
                hiddenRef.current!.innerHTML = currentHTML + clone.outerHTML;

                if (hiddenRef.current) {
                    if (hiddenRef.current?.clientHeight > viewportHeight) {
                        pagesArr.push(currentHTML);
                        currentHTML = clone.outerHTML;
                    } else {
                        currentHTML += clone.outerHTML;
                    }
                }
                return clone.outerHTML;
            }
            return "";
        };

        elements.forEach((node) => processNode(node));

        if (currentHTML) {
            pagesArr.push(currentHTML);
        }
        setPages(pagesArr);
    };

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
            console.log(newNum);
            return newNum;
        })
    }

    const nextPage = () => {
        setCurrentPage((p) => {
            const newNum = Math.min(pages.length - 1, p + 1);
            console.log(newNum);
            return newNum;
        });
    }


    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown as EventListener);

        return () => {
            window.removeEventListener("keydown", handleKeyDown as EventListener);
        }
    }, [handleKeyDown])

    useEffect(() => {
        paginateContent();
        window.addEventListener("resize", paginateContent);

        return () => {
            window.removeEventListener("resize", paginateContent);
        }
    }, [content]);

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
