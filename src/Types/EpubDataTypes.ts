export interface EpubData {
    toc: TOC[];
    chapters: Chapter[];
    css: string;
}

export interface TOC {
    title: string;
    href: string;
}

export interface Chapter {
    title: string;
    href: string;
    content: string;
}