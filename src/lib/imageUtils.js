/**
 * Compresses an image file to be under a target size (default 1MB).
 * @param {File} file - The original image file.
 * @param {number} maxSizeMB - The target maximum size in MB (default 1).
 * @param {number} maxWidth - The maximum width of the image (default 1920).
 * @returns {Promise<File>} - A promise that resolves to the compressed file.
 */
export const compressImage = async (file, maxSizeMB = 1, maxWidth = 1920) => {
    // If file is already smaller than target, return it
    if (file.size / 1024 / 1024 <= maxSizeMB) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if width exceeds maxWidth
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Start compression loop
                let quality = 0.9;

                const recursiveCompress = (q) => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Canvas to Blob failed'));
                                return;
                            }

                            if (blob.size / 1024 / 1024 <= maxSizeMB || q < 0.2) {
                                // Create a new File object
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });
                                console.log(`[ImageUtils] Compressed ${file.size} -> ${compressedFile.size} (Quality: ${q.toFixed(2)})`);
                                resolve(compressedFile);
                            } else {
                                // Try again with lower quality
                                recursiveCompress(q - 0.1);
                            }
                        },
                        'image/jpeg',
                        q
                    );
                };

                recursiveCompress(quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};
