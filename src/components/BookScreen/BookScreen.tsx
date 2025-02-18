import { useEffect, useState } from 'react';
import JSZip from 'jszip'; // Import JSZip

interface BookScreenProps {
    fileUrl: string; // File URL to the EPUB file
}

export const BookScreen: React.FC<BookScreenProps> = ({ fileUrl }) => {
    const [content, setContent] = useState<string>(''); // State to store the extracted content
    const [loading, setLoading] = useState<boolean>(true); // State to track loading
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const loadEPUB = async () => {
            console.log(fileUrl);
            try {
                // Fetch the EPUB file and convert it to an array buffer
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();

                const zip = new JSZip();
                await zip.loadAsync(arrayBuffer); // Load the EPUB file

                const fileNames = Object.keys(zip.files);
                console.log("Files in EPUB:", fileNames);

                const htmlFile = fileNames.find(fileName => fileName.endsWith('.html') || fileName.endsWith('.xhtml') || fileName.endsWith('.htm'));
                if (htmlFile) {
                    const htmlContent = await zip.file(htmlFile)?.async('text');
                    setContent(htmlContent || 'Failed to load HTML content.');
                } else {
                    setContent('No HTML content found in the EPUB.');
                }
            } catch (error: any) {
                console.error('Error loading EPUB:', error);
                setError(`Failed to load EPUB content: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };


        loadEPUB();
    }, [fileUrl]);

    if (loading) {
        return <div>Loading...</div>; // Show a loading state while fetching the EPUB content
    }

    return (
        <div
            style={{ width: '100%', height: '100%', overflowY: 'auto' }}
            dangerouslySetInnerHTML={{ __html: content }} // Display the HTML content
        />
    );
};