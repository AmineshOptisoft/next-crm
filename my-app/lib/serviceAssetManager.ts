import fs from 'fs/promises';
import path from 'path';

/**
 * Service Asset Manager
 * Manages file storage for services in a company-wise folder structure
 */
export class ServiceAssetManager {
    private baseUploadPath = path.join(process.cwd(), 'public', 'uploads');

    /**
     * Get the path for a specific service folder
     */
    getServicePath(companyId: string, serviceId: string): string {
        return path.join(this.baseUploadPath, companyId, 'services', serviceId);
    }

    /**
     * Get the path for a specific company folder
     */
    getCompanyPath(companyId: string): string {
        return path.join(this.baseUploadPath, companyId);
    }

    /**
     * Create folder structure for a new service
     * Creates: /uploads/{companyId}/services/{serviceId}/
     * With subfolders: images/, documents/
     */
    async createServiceFolder(companyId: string, serviceId: string): Promise<string> {
        const servicePath = this.getServicePath(companyId, serviceId);

        try {
            // Create main service folder
            await fs.mkdir(servicePath, { recursive: true });

            // Create subfolders for organization
            await fs.mkdir(path.join(servicePath, 'images'), { recursive: true });
            await fs.mkdir(path.join(servicePath, 'documents'), { recursive: true });

            return servicePath;
        } catch (error) {
            console.error(`❌ Error creating service folder:`, error);
            throw error;
        }
    }

    /**
     * Delete service folder and all its contents
     * Called when a service is deleted
     */
    async deleteServiceFolder(companyId: string, serviceId: string): Promise<void> {
        const servicePath = this.getServicePath(companyId, serviceId);

        try {
            await fs.rm(servicePath, { recursive: true, force: true });
        } catch (error) {
            console.error(`❌ Error deleting service folder:`, error);
            // Don't throw - deletion should not fail the service deletion
        }
    }

    /**
     * Delete company folder and all its services
     * Called when a company is deleted
     */
    async deleteCompanyFolder(companyId: string): Promise<void> {
        const companyPath = this.getCompanyPath(companyId);

        try {
            await fs.rm(companyPath, { recursive: true, force: true });
        } catch (error) {
            console.error(`❌ Error deleting company folder:`, error);
            // Don't throw - deletion should not fail the company deletion
        }
    }

    /**
     * Get public URL for a file
     * Returns: /uploads/{companyId}/services/{serviceId}/{subfolder?}/{fileName}
     */
    getPublicUrl(companyId: string, serviceId: string, fileName: string, subfolder?: string): string {
        const parts = ['/uploads', companyId, 'services', serviceId];
        if (subfolder) {
            parts.push(subfolder);
        }
        parts.push(fileName);
        return parts.join('/');
    }

    /**
     * Save file to service folder
     */
    async saveFile(
        companyId: string,
        serviceId: string,
        file: File,
        subfolder?: string
    ): Promise<string> {
        // Ensure service folder exists
        await this.createServiceFolder(companyId, serviceId);

        const fileName = `${Date.now()}-${file.name}`;
        const targetPath = subfolder
            ? path.join(this.getServicePath(companyId, serviceId), subfolder, fileName)
            : path.join(this.getServicePath(companyId, serviceId), fileName);

        // Convert File to Buffer and save
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(targetPath, buffer);

        return this.getPublicUrl(companyId, serviceId, fileName, subfolder);
    }

    /**
     * Check if service folder exists
     */
    async serviceFolderExists(companyId: string, serviceId: string): Promise<boolean> {
        const servicePath = this.getServicePath(companyId, serviceId);
        try {
            await fs.access(servicePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * List all files in service folder
     */
    async listServiceFiles(companyId: string, serviceId: string): Promise<string[]> {
        const servicePath = this.getServicePath(companyId, serviceId);
        try {
            const files = await fs.readdir(servicePath, { recursive: true });
            return files.filter(file => !file.includes('/') || file.split('/').length === 2);
        } catch {
            return [];
        }
    }
}

// Export singleton instance
export const serviceAssetManager = new ServiceAssetManager();
