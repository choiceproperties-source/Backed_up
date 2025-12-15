import { AdminRepository } from "./admin.repository";

export class AdminService {
  private repository: AdminRepository;

  constructor() {
    this.repository = new AdminRepository();
  }

  async getImageAuditLogs(propertyId?: string, action?: string, limit: number = 100, offset: number = 0): Promise<any> {
    const { logs, total } = await this.repository.getImageAuditLogs(propertyId, action, limit, offset);

    return {
      logs,
      pagination: {
        offset,
        limit,
        total
      }
    };
  }

  async getPersonas(): Promise<any[]> {
    return await this.repository.getPersonas();
  }

  async createPersona(personaData: any): Promise<any> {
    if (!personaData.name || !personaData.description) {
      throw { status: 400, message: "Name and description are required" };
    }

    return await this.repository.createPersona(personaData);
  }

  async updatePersona(id: string, updates: any): Promise<any> {
    if (!id) {
      throw { status: 400, message: "Persona ID is required" };
    }

    return await this.repository.updatePersona(id, updates);
  }

  async deletePersona(id: string): Promise<void> {
    if (!id) {
      throw { status: 400, message: "Persona ID is required" };
    }

    await this.repository.deletePersona(id);
  }

  async getSettings(): Promise<any> {
    return await this.repository.getSettings();
  }

  async updateSettings(updates: any): Promise<any> {
    if (!updates || Object.keys(updates).length === 0) {
      throw { status: 400, message: "No settings provided to update" };
    }

    return await this.repository.updateSettings(updates);
  }
}
