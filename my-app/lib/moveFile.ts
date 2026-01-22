import fs from 'fs/promises';
import path from 'path';

/**
 * Move file from temp folder to service folder
 */
export async function moveFileToServiceFolder(
    tempUrl: string,
    companyId: string,
    serviceId: string,
    subfolder: string = 'images'
): Promise<string> {
    try {
        // Extract filename from temp URL
        // Format: /uploads/{companyId}/temp/{filename}
        const filename = path.basename(tempUrl);

        const tempPath = path.join(
            process.cwd(),
            'public',
            'uploads',
            companyId,
            'temp',
            filename
        );

        const servicePath = path.join(
            process.cwd(),
            'public',
            'uploads',
            companyId,
            'services',
            serviceId,
            subfolder
        );

        // Ensure service folder exists
        await fs.mkdir(servicePath, { recursive: true });

        const newPath = path.join(servicePath, filename);

        // Move file
        await fs.rename(tempPath, newPath);

        // Return new URL
        return `/uploads/${companyId}/services/${serviceId}/${subfolder}/${filename}`;
    } catch (error) {
        console.error('Error moving file:', error);
        // If move fails, return original URL
        return tempUrl;
    }
}
