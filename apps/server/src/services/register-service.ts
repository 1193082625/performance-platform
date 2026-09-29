import type {
    CreatedUserResult,
    UserRepository,
} from '../repositories/user-repository.js'
import { hashPassword } from '../security/password.js'

export interface RegisterInput {
    name: string
    phone: string
    password: string
}

export interface RegisterService {
    register(input: RegisterInput): Promise<CreatedUserResult>
}

export function createRegisterService(
    users: Pick<UserRepository, 'createUser'>,
): RegisterService {
    return {
        async register(input) {
            const passwordHash = await hashPassword(input.password)

            return users.createUser({
                name: input.name,
                phone: input.phone,
                passwordHash,
            })
        },
    }
}
