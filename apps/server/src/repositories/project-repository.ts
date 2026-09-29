export interface OwnedProject {
    id: string
    name: string
    description: string
}

export interface CreateProjectInput {
    name: string
    description: string
}

export interface ProjectRepository {
    findProjectOwnedByUser(
        projectId: string,
        userId: string,
    ): Promise<OwnedProject | undefined>
    createProject(
        ownerId: string,
        input: CreateProjectInput,
    ): Promise<OwnedProject>
    listProjectsOwnedByUser(userId: string): Promise<OwnedProject[]>
}
