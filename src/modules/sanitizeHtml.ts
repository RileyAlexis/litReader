export const sanitizeContent = (content: string) => {
    return content.replace(/[\n\t]+/g, ' ').trim();
};