export interface UserProfile {
    id: string
    name: string
    phone: string
}

export interface UserWithPassword extends UserProfile {
    passwordHash: string
}

export interface CreateUserInput {
    name: string
    phone: string
    passwordHash: string
}

export type CreatedUserResult =
    | {
          ok: true
          user: UserProfile
      }
    | {
          ok: false
          reason: 'phone_taken'
      }

export interface UserRepository {
    createUser(input: CreateUserInput): Promise<CreatedUserResult>
    findUserByPhone(phone: string): Promise<UserWithPassword | undefined>
    findUserById(id: string): Promise<UserProfile | undefined>
}
