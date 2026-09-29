export type ProjectAppPlatform =
    'web' | 'ios' | 'android' | 'mini_program_zfb' | 'mini_program_wx'

export interface ProjectApp {
    id: string
    projectId: string
    appId: string
    name: string
    platform: ProjectAppPlatform
}

export interface CreateProjectAppInput {
    projectId: string
    appId: string
    name: string
    platform: ProjectAppPlatform
}

export interface ProjectAppRepository {
    createProjectApp(input: CreateProjectAppInput): Promise<ProjectApp>
    findProjectApp(
        projectId: string,
        appId: string,
    ): Promise<ProjectApp | undefined>

    listProjectApps(projectId: string): Promise<ProjectApp[]>
}
