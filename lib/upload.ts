import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * Helper function to save a file from FormData to a specific destination.
 * This replaces Multer middleware in Next.js App Router.
 * 
 * @param file - The File object retrieved from formData.get('fieldname')
 * @param destinationFolder - The folder path (relative to project root or public) where you want to save the file. 
 *                            Example: 'public/uploads/users'
 * @returns Object containing success status, saved file path, or error.
 */
export async function uploadFile(file: File, destinationFolder: string) {
    try {
        // 1. Validate file
        if (!file) {
            throw new Error('No file provided');
        }

        // 2. Prepare buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 3. Resolve absolute path
        // We assume the destinationFolder is relative to the project root.
        // If you want it in public, pass 'public/your-folder'.
        const uploadDir = path.join(process.cwd(), destinationFolder);

        // 4. Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        // 5. Generate filename (keeping original extension)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.name);
        const name = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-]/g, ''); // Sanitize
        const finalFilename = `${name}-${uniqueSuffix}${ext}`;

        const finalPath = path.join(uploadDir, finalFilename);

        // 6. Write to disk
        await writeFile(finalPath, buffer);

        // 7. Return relative path for DB saving (remove public if present for URL access)
        // If saved to public/uploads/xyz.jpg, we want URL /uploads/xyz.jpg
        let publicUrl = destinationFolder.replace(/^public/, '').replace(/\\/g, '/');
        if (!publicUrl.startsWith('/')) publicUrl = '/' + publicUrl;

        // Ensure trailing slash for joining
        if (!publicUrl.endsWith('/')) publicUrl = publicUrl + '/';

        return {
            success: true,
            filepath: finalPath,
            url: publicUrl + finalFilename,
            filename: finalFilename
        };

    } catch (error: any) {
        console.error('Upload Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
