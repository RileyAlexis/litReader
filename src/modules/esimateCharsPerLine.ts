export function estimateCharacters(containerWidth: number, fontSize: number, averageCharWidth: number = 0.6): number {
    const charWidth = fontSize * averageCharWidth;
    const numCharacters = Math.floor(containerWidth / charWidth);
    return numCharacters;
}