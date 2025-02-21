export interface EpubData {
    toc: TOC[];
    chapters: Chapter[];
    css: string;
    metaData: MetaData
}

export interface MetaData {
    title: string;
    author: string;
    language: string;
    publisher?: string;
    isbn: string;
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