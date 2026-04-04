import { UserRole } from '../dto/create-user.dto';

export class User {
    id: string;
    login: string;
    password: string;
    role: UserRole;
    createdAt: number;
    updatedAt: number;
}