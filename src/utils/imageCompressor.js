/**
 * Compresses an image file to be under a target size.
 * @param {File} file - The source image file.
 * @param {number} targetSizeMB - Target size in MB (default 2).
 * @param {number} maxWidth - Maximum width/height (default 1920).
 * @returns {Promise<File|Blob>} - The compressed file or original if small enough.
 */
export async function compressImage(file, targetSizeMB = 2, maxWidth = 1920) {
    const targetSizeBytes = targetSizeMB * 1024 * 1024;

    if (file.size <= targetSizeBytes) {
        return file;
    }

    if (file.size > 10 * 1024 * 1024) {
        throw new Error('File too large: Max 10MB allowed for compression.');
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
        };

        reader.onerror = (err) => reject(err);

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Resize if too large
            if (width > maxWidth || height > maxWidth) {
                if (width > height) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                } else {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Iterative compression
            let quality = 0.9;
            let resultBlob = null;

            const attemptCompression = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Compression failed'));
                            return;
                        }

                        if (blob.size <= targetSizeBytes || quality <= 0.1) {
                            // Done or reached limit
                            const resultFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(resultFile);
                        } else {
                            // Try lower quality
                            quality -= 0.1;
                            attemptCompression();
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            attemptCompression();
        };

        reader.readAsDataURL(file);
    });
}
