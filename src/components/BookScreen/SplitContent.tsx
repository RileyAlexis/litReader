import { useEffect, useState, useRef, KeyboardEvent } from "react";

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

        hiddenRef.current.innerHTML = ""; // Clear previous content

        elements.forEach((element) => {
            if (!hiddenRef.current) return;

            const tempContainer = document.createElement("div");

            //Its repeating content because it's cloning one node at a time 
            //and then if it doesn't fit it repeats that same node
            //This needs to split content by word, passing over the HTML tags, 
            //and instert a new tag if it's on the previous page (usually a <p>)
            tempContainer.appendChild(element.cloneNode(true));

            //This is inserting the blank page at the start
            hiddenRef.current.innerHTML = currentHTML + tempContainer.innerHTML;

            if (hiddenRef.current.clientHeight > viewportHeight) {
                pagesArr.push(currentHTML);
                currentHTML = tempContainer.innerHTML;
            } else {
                currentHTML += tempContainer.innerHTML;
            }
        });

        if (currentHTML) pagesArr.push(currentHTML);
        setPages(pagesArr);
    };

    useEffect(() => {
        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                setCurrentPage((p) => Math.max(0, p - 1));
                console.log(event.key);
            } else if (event.key === "ArrowRight") {
                setCurrentPage((p) => Math.min(pages.length - 1, p + 1));
                console.log(event.key);

            }
        }

        window.addEventListener("keydown", handleKeyDown as EventListener);

        return () => {
            window.removeEventListener("keydown", handleKeyDown as EventListener);
        }
    }, []);


    useEffect(() => {
        paginateContent();
        window.addEventListener("resize", paginateContent);

        return () => window.removeEventListener("resize", paginateContent);
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
                <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}>
                    Prev
                </button>
                <button onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}>
                    Next
                </button>
            </div>
        </div>
    )
}
